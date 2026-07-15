const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const ROUTE_PATTERNS = [
  /^\/$/,
  /^\/(?:catalogo(?:\/para-vos)?|vendedores|login|privacidad|perfil\/cliente)\/?$/,
  /^\/registro(?:\/(?:comprador|vendedor))?\/?$/,
  /^\/checkout\/(?:exito|pendiente|fallo)\/?$/,
  new RegExp(`^/(?:producto|vendedor|cliente)/${UUID_SEGMENT}/?$`, "i"),
  new RegExp(
    `^/panel/vendedor(?:/(?:tienda|productos|ventas|notificaciones|productos/edicion-rapida/${UUID_SEGMENT}))?/?$`,
    "i",
  ),
  new RegExp(
    `^/panel/comprador(?:/(?:pedidos/${UUID_SEGMENT}|carrito|cuenta(?:/contacto)?))?/?$`,
    "i",
  ),
];

const DEFAULT_ALLOWED_ORIGINS = [
  "https://nyzca.com",
  "https://marketplace-celulares.netlify.app",
];

const BOT_PATTERN =
  /(?:bot|crawler|spider|headless|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|uptimerobot|monitoring)/i;

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return "";
  }
}

export function isAllowedAnalyticsOrigin(origin: string | null, configuredOrigins?: string) {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : "";
  if (!normalizedOrigin) return false;

  const allowedOrigins = configuredOrigins
    ? configuredOrigins.split(",")
    : DEFAULT_ALLOWED_ORIGINS;
  return allowedOrigins.some((allowedOrigin) => normalizeOrigin(allowedOrigin.trim()) === normalizedOrigin);
}

export function isAllowedAnalyticsPath(path: string) {
  return ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}

export function isAllowedAnalyticsEventPath(eventName: string, path: string) {
  if (!isAllowedAnalyticsPath(path)) return false;
  if (eventName === "product_view") {
    return new RegExp(`^/producto/${UUID_SEGMENT}/?$`, "i").test(path);
  }
  if (eventName === "artisan_view") {
    return new RegExp(`^/vendedor/${UUID_SEGMENT}/?$`, "i").test(path);
  }
  if (eventName === "signup_started") return /^\/registro(?:\/|$)/.test(path);
  return true;
}

export function isKnownAnalyticsBot(userAgent: string | null) {
  return BOT_PATTERN.test(userAgent ?? "");
}

export async function createTemporaryIpHash(
  ipAddress: string,
  secret: string,
  now = new Date(),
) {
  if (!ipAddress || !secret) throw new Error("IP address and HMAC secret are required.");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const dayBucket = now.toISOString().slice(0, 10);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${dayBucket}:${ipAddress}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
