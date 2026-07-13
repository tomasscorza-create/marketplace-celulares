import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

function sorted(values) {
  return [...values].sort();
}

function collectFiles(rootDir, relativeDir, extensions) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const files = [];

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(rootDir, relativePath, extensions));
    } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

export function extractAppReferences(sources) {
  const usedTables = new Set();
  const usedRpcs = new Set();

  for (const source of sources) {
    for (const match of source.matchAll(/\.from\(\s*["']([^"']+)["']\s*\)/g)) {
      usedTables.add(match[1]);
    }

    for (const match of source.matchAll(/\.rpc\(\s*["']([^"']+)["']/g)) {
      usedRpcs.add(match[1]);
    }
  }

  return { usedRpcs, usedTables };
}

export function applyOrderedMigrations(migrationSources) {
  const currentFunctions = new Set();
  const currentRelations = new Set();
  const createdFunctions = new Set();
  const createdRelations = new Set();
  const eventPattern = /\b(?:create\s+(?:or\s+replace\s+)?(table|view|function)\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)|drop\s+(table|view|function)\s+(?:if\s+exists\s+)?public\.([a-z0-9_]+))/gi;

  const orderedMigrationSources = [...migrationSources].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const { source } of orderedMigrationSources) {
    for (const match of source.matchAll(eventPattern)) {
      const isCreate = Boolean(match[1]);
      const objectType = (match[1] ?? match[3]).toLowerCase();
      const objectName = (match[2] ?? match[4]).toLowerCase();
      const currentSet = objectType === "function" ? currentFunctions : currentRelations;
      const createdSet = objectType === "function" ? createdFunctions : createdRelations;

      if (isCreate) {
        currentSet.add(objectName);
        createdSet.add(objectName);
      } else {
        currentSet.delete(objectName);
      }
    }
  }

  return {
    definedFunctions: currentFunctions,
    definedTables: currentRelations,
    removedFunctions: new Set([...createdFunctions].filter((name) => !currentFunctions.has(name))),
    removedTables: new Set([...createdRelations].filter((name) => !currentRelations.has(name))),
  };
}

export function buildBackendReport({ appSources, migrationSources }) {
  const references = extractAppReferences(appSources);
  const schema = applyOrderedMigrations(migrationSources);

  return {
    definedFunctions: sorted(schema.definedFunctions),
    definedTables: sorted(schema.definedTables),
    missingRpcs: sorted(
      new Set([...references.usedRpcs].filter((name) => !schema.definedFunctions.has(name))),
    ),
    missingTables: sorted(
      new Set([...references.usedTables].filter((name) => !schema.definedTables.has(name))),
    ),
    removedFunctions: sorted(schema.removedFunctions),
    removedTables: sorted(schema.removedTables),
    usedRpcs: sorted(references.usedRpcs),
    usedTables: sorted(references.usedTables),
  };
}

export function analyzeBackendSurface(rootDir) {
  const appFiles = [
    ...collectFiles(rootDir, "src", SOURCE_EXTENSIONS),
    ...collectFiles(rootDir, path.join("supabase", "functions"), new Set([".ts"])),
  ].filter((file) => !/\.(?:test|spec)\.(?:ts|tsx)$/i.test(file));
  const migrationFiles = collectFiles(
    rootDir,
    path.join("supabase", "migrations"),
    new Set([".sql"]),
  );
  const report = buildBackendReport({
    appSources: appFiles.map((file) => readFileSync(path.join(rootDir, file), "utf8")),
    migrationSources: migrationFiles.map((file) => ({
      name: path.basename(file),
      source: readFileSync(path.join(rootDir, file), "utf8"),
    })),
  });

  return {
    ...report,
    appFiles,
    latestMigration: migrationFiles.length > 0 ? path.basename(migrationFiles.at(-1)) : null,
    migrationFiles,
  };
}

function renderList(values) {
  return values.length > 0 ? values.map((value) => `- \`${value}\``).join("\n") : "- none";
}

export function renderBackendMap(report) {
  return `# Backend Map

> Archivo generado por \`npm run docs:backend-map\`. La auditoría
> \`npm run audit:backend\` falla si este contenido no coincide con el código y
> el resultado final de las migraciones ordenadas. No editar listas a mano.

## Alcance y fuente de verdad

- Fuente canónica del esquema: \`supabase/migrations/\`, aplicada por nombre en orden ascendente.
- Última migración inspeccionada: \`${report.latestMigration ?? "none"}\`.
- Consumidores inspeccionados: \`src/\` y \`supabase/functions/\`.
- \`supabase/sql/\` es referencia histórica y no participa de esta auditoría.

El análisis rastrea tablas, vistas y funciones del esquema \`public\`. No valida
columnas, constraints, RLS, políticas de Storage ni el estado de un backend
remoto; esos puntos requieren Supabase local y las verificaciones de
\`docs/DB_SAFETY.md\`.

## Tablas y vistas usadas por la aplicación

${renderList(report.usedTables)}

## Tablas y vistas del esquema final

${renderList(report.definedTables)}

## Tablas o vistas usadas pero ausentes

${renderList(report.missingTables)}

## RPC usadas por la aplicación

${renderList(report.usedRpcs)}

## Funciones SQL del esquema final

${renderList(report.definedFunctions)}

## RPC usadas pero ausentes

${renderList(report.missingRpcs)}

## Objetos históricos eliminados por migraciones posteriores

### Tablas y vistas

${renderList(report.removedTables)}

### Funciones

${renderList(report.removedFunctions)}

Estas listas explican por qué un objeto puede aparecer en una migración
histórica sin existir en el esquema vigente. No deben reintroducirse basándose
únicamente en archivos antiguos.

## Validación repetible

\`\`\`powershell
npm run docs:backend-map
npm run audit:backend
\`\`\`

Regenerar el mapa sólo después de revisar el cambio de esquema. La auditoría
sale con código distinto de cero si el código usa una tabla/RPC ausente o si el
mapa quedó desactualizado.
`;
}
