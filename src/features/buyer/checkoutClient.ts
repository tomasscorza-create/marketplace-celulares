import type { CreateCheckoutRequest, CreateCheckoutResponse } from "../../types/commerce";

import { getSupabaseClient } from "../../lib/supabase/client";

export async function createMercadoPagoCheckout(
  input: CreateCheckoutRequest = {},
): Promise<{ data: CreateCheckoutResponse | null; error: Error | null }> {
  const client = getSupabaseClient();
  const response = await client.functions.invoke<CreateCheckoutResponse>(
    "create-mercadopago-checkout",
    {
      body: input,
    },
  );

  if (response.error) {
    const context = (response.error as { context?: Response }).context;
    const payload = context
      ? ((await context.json().catch(() => null)) as { error?: string } | null)
      : null;

    return {
      data: null,
      error: new Error(payload?.error || response.error.message),
    };
  }

  if (!response.data) {
    return {
      data: null,
      error: new Error("No pudimos iniciar el checkout en este momento."),
    };
  }

  return {
    data: response.data,
    error: null,
  };
}
