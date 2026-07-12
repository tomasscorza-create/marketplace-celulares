export type InternalNotification = {
  body: string;
  created_at: string;
  created_by: string | null;
  id: string;
  is_active: boolean;
  published_at: string;
  title: string;
  updated_at: string;
};

export type InternalNotificationSignature = {
  notification_id: string;
  signed_at: string;
  signer_email: string;
  signer_name: string;
  user_id: string;
};

export type InternalNotificationItem = {
  notification: InternalNotification;
  signature: InternalNotificationSignature | null;
};

export type AdminInternalNotification = InternalNotification & {
  signed_count: number;
};

export type InternalNotificationInput = {
  body: string;
  title: string;
};
