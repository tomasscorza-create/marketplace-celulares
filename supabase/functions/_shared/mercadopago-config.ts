export type MercadoPagoEnvironment = "test" | "production";

export type MercadoPagoConfig = {
  accessToken: string;
  environment: MercadoPagoEnvironment;
};

function normalizeMercadoPagoEnvironment(value: string | undefined | null) {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === "production" || normalizedValue === "prod") {
    return "production";
  }

  if (normalizedValue === "test" || normalizedValue === "sandbox") {
    return "test";
  }

  return null;
}

function getScopedAccessTokenName(environment: MercadoPagoEnvironment) {
  return environment === "production"
    ? "MERCADOPAGO_PRODUCTION_ACCESS_TOKEN"
    : "MERCADOPAGO_TEST_ACCESS_TOKEN";
}

function getScopedWebhookSecretName(environment: MercadoPagoEnvironment) {
  return environment === "production"
    ? "MERCADOPAGO_PRODUCTION_WEBHOOK_SECRET"
    : "MERCADOPAGO_TEST_WEBHOOK_SECRET";
}

export function getMercadoPagoConfig(): MercadoPagoConfig {
  const explicitEnvironment = normalizeMercadoPagoEnvironment(
    Deno.env.get("MERCADOPAGO_ENVIRONMENT") ?? Deno.env.get("MERCADOPAGO_MODE"),
  );
  const testAccessToken = Deno.env.get("MERCADOPAGO_TEST_ACCESS_TOKEN");
  const productionAccessToken = Deno.env.get("MERCADOPAGO_PRODUCTION_ACCESS_TOKEN");
  const fallbackAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const inferredEnvironment =
    explicitEnvironment ??
    (testAccessToken
      ? "test"
      : productionAccessToken || fallbackAccessToken?.startsWith("APP_USR-")
        ? "production"
        : "test");
  const environment: MercadoPagoEnvironment = inferredEnvironment;
  const scopedAccessTokenName = getScopedAccessTokenName(environment);
  const accessToken =
    (environment === "production" ? productionAccessToken : testAccessToken) ??
    fallbackAccessToken;

  if (!accessToken) {
    throw new Error(
      `Missing required environment variable: ${scopedAccessTokenName} or MERCADOPAGO_ACCESS_TOKEN`,
    );
  }

  return {
    accessToken,
    environment,
  };
}

export function getMercadoPagoWebhookSecret(environment: MercadoPagoEnvironment) {
  return (
    Deno.env.get(getScopedWebhookSecretName(environment)) ??
    Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET") ??
    null
  );
}
