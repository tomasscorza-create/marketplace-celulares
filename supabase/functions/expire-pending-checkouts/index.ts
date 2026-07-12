import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import {
  CHECKOUT_EXPIRATION_HOURS,
  expirePendingCheckouts,
} from "../_shared/checkout-expiration.ts";

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

function requireCronSecret(request: Request) {
  const cronSecret = Deno.env.get("PENDING_CHECKOUTS_CRON_SECRET")?.trim();

  if (!cronSecret) {
    return jsonResponse(
      { error: "PENDING_CHECKOUTS_CRON_SECRET is required." },
      500,
    );
  }

  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const cronSecretErrorResponse = requireCronSecret(request);

    if (cronSecretErrorResponse) {
      return cronSecretErrorResponse;
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const result = await expirePendingCheckouts(adminClient);

    return jsonResponse({
      ...result,
      expirationHours: CHECKOUT_EXPIRATION_HOURS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected expiration error.";

    return jsonResponse({ error: message }, 500);
  }
});
