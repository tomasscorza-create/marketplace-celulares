import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

type AdminAction = "create" | "update" | "delete";

type RequestBody = {
  action?: AdminAction;
  artisanId?: string;
  payload?: {
    email?: string;
    full_name?: string;
    password?: string;
    profile_image_url?: string;
    store_description?: string;
    store_name?: string;
    storefront_theme_color?: string;
  };
};

type ProfileRow = {
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  profile_image_url: string | null;
  role: "admin" | "artisan" | "buyer";
  store_description: string | null;
  store_name: string | null;
  storefront_theme_color: string | null;
};

type ProductDeleteRow = {
  id: string;
};

const ARTISAN_PROFILE_BUCKET = "artisan-profile-images";

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

function cleanNullableText(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function cleanRequiredText(value: string | undefined, fieldLabel: string) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    throw new Error(`${fieldLabel} es obligatorio.`);
  }

  return trimmedValue;
}

function cleanEmail(value: string | undefined) {
  const email = cleanRequiredText(value, "El mail").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Ingresa un mail válido.");
  }

  return email;
}

function cleanPassword(value: string | undefined, isEditing = false) {
  const nextPassword = value?.trim() ?? "";

  if (!nextPassword) {
    if (isEditing) {
      return undefined;
    }

    throw new Error("La contraseña es obligatoria.");
  }

  if (nextPassword.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  return nextPassword;
}

function extractStoragePathFromPublicUrl(bucket: string, imageUrl: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const [pathPart] = imageUrl.split("?")[0].split("#");
  const markerIndex = pathPart.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const nextPath = pathPart.slice(markerIndex + marker.length);

  return nextPath.length > 0 ? decodeURIComponent(nextPath) : null;
}

function collectStoragePaths(bucket: string, imageUrls: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      imageUrls
        .filter((value): value is string => Boolean(value))
        .map((imageUrl) => extractStoragePathFromPublicUrl(bucket, imageUrl))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

async function requireAdminProfile(
  supabaseUrl: string,
  supabaseServiceRoleKey: string,
  authorizationHeader: string | null,
) {
  if (!authorizationHeader) {
    return {
      adminClient: null,
      errorResponse: jsonResponse({ error: "Missing authorization header." }, 401),
      profile: null,
      user: null,
    };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const accessToken = authorizationHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return {
      adminClient: null,
      errorResponse: jsonResponse({ error: "Missing access token." }, 401),
      profile: null,
      user: null,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !user) {
    return {
      adminClient: null,
      errorResponse: jsonResponse({ error: "Unauthorized." }, 401),
      profile: null,
      user: null,
    };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (profileError || !profile || profile.role !== "admin") {
    return {
      adminClient: null,
      errorResponse: jsonResponse({ error: "Solo cuentas admin pueden gestionar vendedores." }, 403),
      profile: null,
      user: null,
    };
  }

  return {
    adminClient,
    errorResponse: null,
    profile,
    user,
  };
}

async function loadArtisanProfile(adminClient: ReturnType<typeof createClient>, artisanId: string) {
  return adminClient
    .from("profiles")
    .select(
      "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, created_at",
    )
    .eq("id", artisanId)
    .eq("role", "artisan")
    .single<ProfileRow>();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const access = await requireAdminProfile(
      supabaseUrl,
      supabaseServiceRoleKey,
      request.headers.get("Authorization"),
    );

    if (access.errorResponse || !access.adminClient) {
      return access.errorResponse;
    }

    const adminClient = access.adminClient;
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const action = body.action;

    if (!action || !["create", "update", "delete"].includes(action)) {
      return jsonResponse({ error: "Acción inválida para perfiles de vendedor." }, 400);
    }

    if (action === "create") {
      const payload = body.payload ?? {};
      const email = cleanEmail(payload.email);
      const fullName = cleanRequiredText(payload.full_name, "El nombre");
      const password = cleanPassword(payload.password);
      const storeName = cleanNullableText(payload.store_name);
      const storeDescription = cleanNullableText(payload.store_description);
      const profileImageUrl = cleanNullableText(payload.profile_image_url);
      const storefrontThemeColor = cleanNullableText(payload.storefront_theme_color) ?? "#0F766E";

      const { data: createdUserData, error: createUserError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          password,
          user_metadata: {
            full_name: fullName,
          },
        });

      if (createUserError || !createdUserData.user) {
        return jsonResponse(
          { error: createUserError?.message ?? "No pudimos crear la cuenta vendedora." },
          400,
        );
      }

      const artisanId = createdUserData.user.id;
      const { data: createdProfile, error: profileUpsertError } = await adminClient
        .from("profiles")
        .upsert({
          id: artisanId,
          email,
          full_name: fullName,
          profile_image_url: profileImageUrl,
          role: "artisan",
          store_description: storeDescription,
          store_name: storeName,
          storefront_theme_color: storefrontThemeColor,
        })
        .select(
          "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, created_at",
        )
        .single<ProfileRow>();

      if (profileUpsertError || !createdProfile) {
        await adminClient.auth.admin.deleteUser(artisanId);
        return jsonResponse({ error: "No pudimos preparar el perfil vendedor." }, 500);
      }

      return jsonResponse(createdProfile, 201);
    }

    const artisanId = body.artisanId?.trim();

    if (!artisanId) {
      return jsonResponse({ error: "Falta indicar el perfil vendedor." }, 400);
    }

    const { data: existingProfile, error: existingProfileError } = await loadArtisanProfile(
      adminClient,
      artisanId,
    );

    if (existingProfileError || !existingProfile) {
      return jsonResponse({ error: "No encontramos ese perfil vendedor." }, 404);
    }

    if (action === "update") {
      const payload = body.payload ?? {};
      const email = cleanEmail(payload.email);
      const fullName = cleanRequiredText(payload.full_name, "El nombre");
      const password = cleanPassword(payload.password, true);
      const storeName = cleanNullableText(payload.store_name);
      const storeDescription = cleanNullableText(payload.store_description);
      const profileImageUrl = cleanNullableText(payload.profile_image_url);
      const storefrontThemeColor = cleanNullableText(payload.storefront_theme_color) ?? "#0F766E";

      const { data: updatedProfile, error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({
          email,
          full_name: fullName,
          profile_image_url: profileImageUrl,
          store_description: storeDescription,
          store_name: storeName,
          storefront_theme_color: storefrontThemeColor,
        })
        .eq("id", artisanId)
        .select(
          "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, created_at",
        )
        .single<ProfileRow>();

      if (profileUpdateError || !updatedProfile) {
        return jsonResponse(
          { error: profileUpdateError?.message ?? "No pudimos actualizar el perfil vendedor." },
          400,
        );
      }

      const nextUserData: {
        email?: string;
        password?: string;
        user_metadata?: Record<string, string>;
      } = {
        user_metadata: {
          full_name: fullName,
        },
      };

      if (email !== existingProfile.email) {
        nextUserData.email = email;
      }

      if (password) {
        nextUserData.password = password;
      }

      if (nextUserData.email || nextUserData.password || nextUserData.user_metadata) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
          artisanId,
          nextUserData,
        );

        if (authUpdateError) {
          const { error: rollbackError } = await adminClient
            .from("profiles")
            .update({
              email: existingProfile.email,
              full_name: existingProfile.full_name,
              profile_image_url: existingProfile.profile_image_url,
              role: existingProfile.role,
              store_description: existingProfile.store_description,
              store_name: existingProfile.store_name,
              storefront_theme_color: existingProfile.storefront_theme_color,
            })
            .eq("id", artisanId);

          return jsonResponse(
            {
              error: `${authUpdateError.message ?? "No pudimos actualizar el acceso del vendedor."}${
                rollbackError
                  ? " Además, no pudimos restaurar automáticamente los datos visibles del perfil."
                  : ""
              }`,
            },
            400,
          );
        }
      }

      return jsonResponse(updatedProfile);
    }

    const [productsResponse, orderItemsResponse] = await Promise.all([
      adminClient
        .from("products")
        .select("id")
        .eq("artisan_id", artisanId)
        .returns<ProductDeleteRow[]>(),
      adminClient.from("order_items").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId),
    ]);

    if (orderItemsResponse.error) {
      return jsonResponse(
        {
          error:
            orderItemsResponse.error.message ??
            "No pudimos revisar el historial asociado a este perfil vendedor.",
        },
        400,
      );
    }

    if ((orderItemsResponse.count ?? 0) > 0) {
      return jsonResponse(
        {
          error:
            "Este perfil tiene ventas o historial asociado. Para borrarlo primero hay que revisar ese contenido.",
        },
        409,
      );
    }

    if (productsResponse.error) {
      return jsonResponse(
        { error: productsResponse.error.message ?? "No pudimos revisar los productos del perfil." },
        400,
      );
    }

    const productRows = productsResponse.data ?? [];
    const productIds = productRows.map((product) => product.id);
    const profileImagePaths = collectStoragePaths(ARTISAN_PROFILE_BUCKET, [
      existingProfile.profile_image_url,
    ]);
    if (productIds.length > 0) {
      const { error: deleteProductsError } = await adminClient
        .from("products")
        .delete()
        .eq("artisan_id", artisanId);

      if (deleteProductsError) {
        return jsonResponse(
          {
            error:
              deleteProductsError.message ??
              "No pudimos limpiar los productos residuales del perfil antes de borrarlo.",
          },
          400,
        );
      }
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(artisanId);

    if (deleteUserError) {
      return jsonResponse(
        { error: deleteUserError.message ?? "No pudimos borrar la cuenta vendedora." },
        400,
      );
    }

    const profileCleanupResponse = await (
      profileImagePaths.length > 0
        ? adminClient.storage.from(ARTISAN_PROFILE_BUCKET).remove(profileImagePaths)
        : Promise.resolve({ data: [], error: null })
    );

    const cleanupErrors = [profileCleanupResponse.error?.message].filter(
      (value): value is string => Boolean(value),
    );

    return jsonResponse({
      cleanupWarning:
        cleanupErrors.length > 0
          ? "La cuenta se elimino, pero quedaron archivos viejos en storage para revisar."
          : null,
      deletedProfileId: artisanId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected admin artisan error.";

    return jsonResponse({ error: message }, 500);
  }
});


