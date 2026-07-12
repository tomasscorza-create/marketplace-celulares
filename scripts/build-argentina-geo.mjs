import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "src", "data");
const outputFile = path.join(outputDirectory, "argentinaGeo.json");
const API_BASE_URL = "https://apis.datos.gob.ar/georef/api";
const PAGE_SIZE = 5000;

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sortByName(left, right) {
  return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
}

async function fetchJson(resourcePath, searchParams) {
  const url = new URL(`${API_BASE_URL}/${resourcePath}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No pudimos consultar ${url.toString()} (${response.status}).`);
  }

  return response.json();
}

async function fetchProvinces() {
  const response = await fetchJson("provincias", {
    campos: "id,nombre",
    max: 30,
  });

  return (response.provincias ?? [])
    .map((province) => ({
      id: province.id,
      name: province.nombre,
      normalizedName: normalizeText(province.nombre),
    }))
    .sort(sortByName);
}

async function fetchProvinceLocalities(province) {
  const localities = [];
  let offset = 0;
  let total = 0;

  do {
    const response = await fetchJson("localidades", {
      provincia: province.id,
      campos: "id,nombre,provincia,municipio,departamento,centroide",
      max: PAGE_SIZE,
      inicio: offset,
    });

    total = Number(response.total ?? 0);
    const batch = (response.localidades ?? []).map((locality) => ({
      id: locality.id,
      latitude:
        typeof locality.centroide?.lat === "number" ? Number(locality.centroide.lat) : null,
      longitude:
        typeof locality.centroide?.lon === "number" ? Number(locality.centroide.lon) : null,
      name: locality.nombre,
      municipality: locality.municipio?.nombre ?? "",
      department: locality.departamento?.nombre ?? "",
      normalizedName: normalizeText(locality.nombre),
    }));

    localities.push(...batch);
    offset += Number(response.cantidad ?? batch.length);
  } while (offset < total);

  return localities.sort(sortByName);
}

async function main() {
  const provinces = await fetchProvinces();
  const provinceRecords = [];

  for (const province of provinces) {
    const localities = await fetchProvinceLocalities(province);

    provinceRecords.push({
      id: province.id,
      name: province.name,
      normalizedName: province.normalizedName,
      localityCount: localities.length,
      localities,
    });
  }

  const payload = {
    country: "Argentina",
    generatedAt: new Date().toISOString(),
    source: "https://apis.datos.gob.ar/georef/api",
    provinces: provinceRecords,
    provinceCount: provinceRecords.length,
    localityCount: provinceRecords.reduce((sum, province) => sum + province.localities.length, 0),
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  process.stdout.write(
    `Dataset generado en ${outputFile} con ${payload.provinceCount} provincias y ${payload.localityCount} localidades.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
