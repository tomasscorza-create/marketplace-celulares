import type { UserProfile } from "@/types/auth";
import type {
  AdminInternalNotification,
  InternalNotification,
  InternalNotificationInput,
  InternalNotificationItem,
  InternalNotificationSignature,
} from "@/types/internalNotifications";

import { getSupabaseClient } from "@/lib/supabase/client";

function normalizeNotificationInput(input: InternalNotificationInput) {
  return {
    body: input.body.trim(),
    title: input.title.trim(),
  };
}

function buildNotificationItems(
  notifications: InternalNotification[],
  signatures: InternalNotificationSignature[],
) {
  const signaturesByNotificationId = new Map(
    signatures.map((signature) => [signature.notification_id, signature]),
  );

  return notifications.map((notification) => ({
    notification,
    signature: signaturesByNotificationId.get(notification.id) ?? null,
  })) satisfies InternalNotificationItem[];
}

export async function getAdminInternalNotifications() {
  const client = getSupabaseClient();
  const [notificationsResponse, signaturesResponse] = await Promise.all([
    client
      .from("internal_notifications")
      .select("*")
      .order("published_at", { ascending: false })
      .returns<InternalNotification[]>(),
    client
      .from("internal_notification_signatures")
      .select("notification_id")
      .returns<Array<Pick<InternalNotificationSignature, "notification_id">>>(),
  ]);

  const error = notificationsResponse.error ?? signaturesResponse.error;

  if (error) {
    return { data: null, error };
  }

  const signedCountByNotificationId = new Map<string, number>();
  (signaturesResponse.data ?? []).forEach((signature) => {
    signedCountByNotificationId.set(
      signature.notification_id,
      (signedCountByNotificationId.get(signature.notification_id) ?? 0) + 1,
    );
  });

  return {
    data: (notificationsResponse.data ?? []).map((notification) => ({
      ...notification,
      signed_count: signedCountByNotificationId.get(notification.id) ?? 0,
    })) satisfies AdminInternalNotification[],
    error: null,
  };
}

export async function createInternalNotification(
  input: InternalNotificationInput,
  createdBy: string,
) {
  const client = getSupabaseClient();
  const payload = normalizeNotificationInput(input);

  return client
    .from("internal_notifications")
    .insert({
      body: payload.body,
      created_by: createdBy,
      title: payload.title,
    })
    .select("*")
    .single<InternalNotification>();
}

export async function deleteInternalNotification(notificationId: string) {
  const client = getSupabaseClient();

  return client.from("internal_notifications").delete().eq("id", notificationId);
}

export async function getArtisanInternalNotificationItems(artisanId: string) {
  const client = getSupabaseClient();
  const [notificationsResponse, signaturesResponse] = await Promise.all([
    client
      .from("internal_notifications")
      .select("*")
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .returns<InternalNotification[]>(),
    client
      .from("internal_notification_signatures")
      .select("*")
      .eq("user_id", artisanId)
      .returns<InternalNotificationSignature[]>(),
  ]);

  const error = notificationsResponse.error ?? signaturesResponse.error;

  if (error) {
    return { data: null, error };
  }

  return {
    data: buildNotificationItems(
      notificationsResponse.data ?? [],
      signaturesResponse.data ?? [],
    ),
    error: null,
  };
}

export async function signInternalNotification(
  notificationId: string,
  profile: Pick<UserProfile, "email" | "full_name" | "id">,
) {
  const client = getSupabaseClient();

  return client
    .from("internal_notification_signatures")
    .upsert(
      {
        notification_id: notificationId,
        signer_email: profile.email,
        signer_name: profile.full_name,
        user_id: profile.id,
      },
      { onConflict: "notification_id,user_id" },
    )
    .select("*")
    .single<InternalNotificationSignature>();
}
