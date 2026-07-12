type GeocodeAddressInput = {
  city: string;
  number: string;
  province: string;
  street: string;
};

type GeocodeAddressResult = {
  latitude: number;
  longitude: number;
};

type GeocodeAddressOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

const geocodeCache = new Map<string, GeocodeAddressResult>();
const storagePrefix = "buyer-geocode:";
const DEFAULT_GEOCODE_TIMEOUT_MS = 4500;

function normalizeAddressPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function buildGeocodeKey(input: GeocodeAddressInput) {
  return [
    normalizeAddressPart(input.street),
    normalizeAddressPart(input.number),
    normalizeAddressPart(input.city),
    normalizeAddressPart(input.province),
    "Argentina",
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
}

function readCachedCoordinates(cacheKey: string) {
  const memoryValue = geocodeCache.get(cacheKey);

  if (memoryValue) {
    return memoryValue;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(`${storagePrefix}${cacheKey}`);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as GeocodeAddressResult;

    if (typeof parsedValue.latitude === "number" && typeof parsedValue.longitude === "number") {
      geocodeCache.set(cacheKey, parsedValue);
      return parsedValue;
    }
  } catch {
    window.localStorage.removeItem(`${storagePrefix}${cacheKey}`);
  }

  return null;
}

function writeCachedCoordinates(cacheKey: string, value: GeocodeAddressResult) {
  geocodeCache.set(cacheKey, value);

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${storagePrefix}${cacheKey}`, JSON.stringify(value));
}

export function buildFullAddressQuery(input: GeocodeAddressInput) {
  return [
    `${normalizeAddressPart(input.street)} ${normalizeAddressPart(input.number)}`.trim(),
    normalizeAddressPart(input.city),
    normalizeAddressPart(input.province),
    "Argentina",
  ]
    .filter(Boolean)
    .join(", ");
}

export function isGeocodeAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function geocodeAddress(
  input: GeocodeAddressInput,
  options: GeocodeAddressOptions = {},
) {
  const cacheKey = buildGeocodeKey(input);
  const cachedValue = readCachedCoordinates(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_GEOCODE_TIMEOUT_MS;
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const abortFromExternalSignal = () => {
    if (!controller.signal.aborted) {
      controller.abort(options.signal?.reason);
    }
  };

  if (options.signal) {
    if (options.signal.aborted) {
      abortFromExternalSignal();
    } else {
      options.signal.addEventListener("abort", abortFromExternalSignal, { once: true });
    }
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort(new DOMException("Timeout", "AbortError"));
    }, timeoutMs);
  }

  const query = buildFullAddressQuery(input);
  const searchParams = new URLSearchParams({
    addressdetails: "1",
    countrycodes: "ar",
    format: "jsonv2",
    limit: "1",
    q: query,
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
      {
        headers: {
          "Accept-Language": "es-AR,es;q=0.9",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("No pudimos validar esta direccion en este momento.");
    }

    const results = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;
    const firstResult = results[0];

    if (!firstResult?.lat || !firstResult?.lon) {
      throw new Error("No encontramos esa direccion exacta. Revisa calle, numero y ciudad.");
    }

    const geocodedValue = {
      latitude: Number(firstResult.lat),
      longitude: Number(firstResult.lon),
    };

    if (!Number.isFinite(geocodedValue.latitude) || !Number.isFinite(geocodedValue.longitude)) {
      throw new Error("No pudimos ubicar esta direccion exacta.");
    }

    writeCachedCoordinates(cacheKey, geocodedValue);
    return geocodedValue;
  } catch (error) {
    if (didTimeout) {
      throw new Error(
        "La validacion exacta de la direccion esta demorada. Usaremos una referencia aproximada si esta disponible.",
      );
    }

    if (isGeocodeAbortError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("No pudimos validar esta direccion en este momento.");
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    if (options.signal) {
      options.signal.removeEventListener("abort", abortFromExternalSignal);
    }
  }
}
