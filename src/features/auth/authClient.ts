import type { UserProfile } from "../../types/auth";

import { getSupabaseClient } from "../../lib/supabase/client";

type SignInWithPasswordInput = {
  email: string;
  password: string;
};

type SignUpBuyerInput = {
  email: string;
  fullName: string;
  password: string;
};

type SignUpArtisanInput = {
  email: string;
  fullName: string;
  password: string;
  sellerPassword: string;
};

function isMissingBuyerProfileBioColumn(
  error: {
    code?: string;
    details?: string | null;
    message?: string | null;
  } | null,
) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  return (
    error?.code === "PGRST204" ||
    errorText.includes("buyer_profile_bio") ||
    errorText.includes("could not find the") ||
    errorText.includes("does not exist") ||
    errorText.includes("column")
  );
}

export async function signInWithPassword({
  email,
  password,
}: SignInWithPasswordInput) {
  const client = getSupabaseClient();

  return client.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpBuyer({
  email,
  fullName,
  password,
}: SignUpBuyerInput) {
  const client = getSupabaseClient();

  return client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
}

export async function signUpArtisan({
  email,
  fullName,
  password,
  sellerPassword,
}: SignUpArtisanInput) {
  const client = getSupabaseClient();

  return client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        requested_role: "artisan",
        artisan_access_key: sellerPassword,
      },
    },
  });
}

export async function signOut() {
  const client = getSupabaseClient();

  return client.auth.signOut();
}

export async function resetPasswordForEmail(email: string) {
  const client = getSupabaseClient();

  return client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
}

export async function getCurrentUserProfile(userId: string) {
  const client = getSupabaseClient();

  const enrichedResponse = await client
    .from("profiles")
    .select(
      "id, full_name, email, role, store_name, store_description, buyer_profile_bio, profile_image_url, storefront_theme_color, created_at",
    )
    .eq("id", userId)
    .single<UserProfile>();

  if (
    enrichedResponse.error &&
    isMissingBuyerProfileBioColumn(enrichedResponse.error)
  ) {
    return client
      .from("profiles")
      .select(
        "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, created_at",
      )
      .eq("id", userId)
      .single<UserProfile>();
  }

  return enrichedResponse;
}
