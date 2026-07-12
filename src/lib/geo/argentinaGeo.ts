import argentinaGeoUrl from "../../data/argentinaGeo.json?url";

export type ArgentinaLocalityRecord = {
  latitude: number | null;
  longitude: number | null;
  department: string;
  id: string;
  municipality: string;
  name: string;
  normalizedName: string;
};

export type ArgentinaProvinceRecord = {
  id: string;
  localityCount: number;
  localities: ArgentinaLocalityRecord[];
  name: string;
  normalizedName: string;
};

export type ArgentinaGeoDataset = {
  country: string;
  generatedAt: string;
  localityCount: number;
  provinceCount: number;
  provinces: ArgentinaProvinceRecord[];
  source: string;
};

let datasetCache: ArgentinaGeoDataset | null = null;

const provincePriorityLocalities: Record<string, string[]> = {
  "02": ["Ciudad de Buenos Aires"],
  "06": ["La Plata", "Mar del Plata", "Bahia Blanca"],
  "10": ["San Fernando del Valle de Catamarca", "Belen", "Tinogasta"],
  "14": ["Cordoba", "Rio Cuarto", "Villa Carlos Paz"],
  "18": ["Corrientes", "Goya", "Paso de los Libres"],
  "22": ["Resistencia", "Presidencia Roque Saenz Pena", "Villa Angela"],
  "26": ["Rawson", "Comodoro Rivadavia", "Puerto Madryn"],
  "30": ["Parana", "Concordia", "Gualeguaychu"],
  "34": ["Formosa", "Clorinda", "Pirane"],
  "38": ["San Salvador de Jujuy", "Palpala", "Libertador General San Martin"],
  "42": ["Santa Rosa", "General Pico", "Toay"],
  "46": ["La Rioja", "Chilecito", "Aimogasta"],
  "50": ["Mendoza", "San Rafael", "Godoy Cruz"],
  "54": ["Posadas", "Obera", "Eldorado"],
  "58": ["Neuquen", "Cutral Co", "Zapala"],
  "62": ["Viedma", "General Roca", "San Carlos de Bariloche"],
  "66": ["Salta", "San Ramon de la Nueva Oran", "Tartagal"],
  "70": ["San Juan", "Rivadavia", "Rawson"],
  "74": ["San Luis", "Villa Mercedes", "Merlo"],
  "78": ["Rio Gallegos", "Caleta Olivia", "El Calafate"],
  "82": ["Santa Fe", "Rosario", "Rafaela"],
  "86": ["Santiago del Estero", "La Banda", "Termas de Rio Hondo"],
  "90": ["San Miguel de Tucuman", "Yerba Buena - Marcos Paz", "Tafi Viejo"],
  "94": ["Ushuaia", "Rio Grande", "Laguna Escondida"],
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function compareLocalitiesAlphabetically(
  left: ArgentinaLocalityRecord,
  right: ArgentinaLocalityRecord,
) {
  return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
}

function getPriorityLocalityRank(provinceId: string, locality: ArgentinaLocalityRecord) {
  const priorityList = provincePriorityLocalities[provinceId];

  if (!priorityList) {
    return Number.POSITIVE_INFINITY;
  }

  const localityName = normalizeSearchText(locality.name);
  const index = priorityList.findIndex((candidate) => normalizeSearchText(candidate) === localityName);

  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

export async function loadArgentinaGeoDataset() {
  if (datasetCache) {
    return datasetCache;
  }

  const response = await fetch(argentinaGeoUrl);

  if (!response.ok) {
    throw new Error("No pudimos cargar la base oficial de provincias y localidades.");
  }

  datasetCache = (await response.json()) as ArgentinaGeoDataset;
  return datasetCache;
}

export function getProvinceById(
  dataset: ArgentinaGeoDataset | null,
  provinceId: string | null | undefined,
) {
  if (!dataset || !provinceId) {
    return null;
  }

  return dataset.provinces.find((province) => province.id === provinceId) ?? null;
}

function findProvinceByName(
  dataset: ArgentinaGeoDataset | null,
  provinceName: string | null | undefined,
) {
  if (!dataset || !provinceName) {
    return null;
  }

  const normalizedProvinceName = normalizeSearchText(provinceName);

  return dataset.provinces.find((province) => province.normalizedName === normalizedProvinceName) ?? null;
}

export function resolveLocalityFromAddressDetails(
  dataset: ArgentinaGeoDataset | null,
  addressDetails:
    | {
        city?: string | null;
        cityId?: string | null;
        cityName?: string | null;
        provinceId?: string | null;
        provinceName?: string | null;
      }
    | null
    | undefined,
) {
  if (!dataset || !addressDetails) {
    return null;
  }

  const province =
    getProvinceById(dataset, addressDetails.provinceId) ??
    findProvinceByName(dataset, addressDetails.provinceName);

  if (!province) {
    return null;
  }

  if (addressDetails.cityId) {
    const localityById = province.localities.find((locality) => locality.id === addressDetails.cityId);

    if (localityById) {
      return localityById;
    }
  }

  const normalizedCityName = normalizeSearchText(
    addressDetails.cityName || addressDetails.city || "",
  );

  if (!normalizedCityName) {
    return null;
  }

  return province.localities.find((locality) => locality.normalizedName === normalizedCityName) ?? null;
}

export function searchProvinceLocalities(
  dataset: ArgentinaGeoDataset | null,
  provinceId: string,
  query: string,
  limit = 12,
) {
  const province = getProvinceById(dataset, provinceId);

  if (!province) {
    return [];
  }

  const normalizedQuery = normalizeSearchText(query);
  const filtered = normalizedQuery
    ? province.localities.filter((locality) =>
        locality.normalizedName.toLowerCase().includes(normalizedQuery),
      )
    : province.localities;

  return [...filtered]
    .sort((left, right) => {
      const leftRank = getPriorityLocalityRank(province.id, left);
      const rightRank = getPriorityLocalityRank(province.id, right);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return compareLocalitiesAlphabetically(left, right);
    })
    .slice(0, limit);
}
