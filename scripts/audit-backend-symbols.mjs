import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  analyzeBackendSurface,
  renderBackendMap,
} from "./lib/backend-schema-audit.mjs";

const rootDir = process.cwd();
const backendMapPath = path.join(rootDir, "docs", "BACKEND_MAP.md");
const shouldWriteMap = process.argv.includes("--write-map");
const report = analyzeBackendSurface(rootDir);
const expectedBackendMap = renderBackendMap(report);

function printList(title, values) {
  console.log(`\n${title}`);

  if (values.length === 0) {
    console.log("- none");
    return;
  }

  for (const value of values) {
    console.log(`- ${value}`);
  }
}

if (shouldWriteMap) {
  writeFileSync(backendMapPath, expectedBackendMap, "utf8");
  console.log(`Updated ${path.relative(rootDir, backendMapPath).replaceAll(path.sep, "/")}`);
}

const actualBackendMap = readFileSync(backendMapPath, "utf8").replaceAll("\r\n", "\n");
const isBackendMapCurrent = actualBackendMap === expectedBackendMap;

console.log(`Migration source: supabase/migrations (${report.migrationFiles.length} files)`);
console.log(`Latest migration: ${report.latestMigration ?? "none"}`);
console.log(`Backend map: ${isBackendMapCurrent ? "current" : "out of date"}`);
printList("Used tables/views", report.usedTables);
printList("Final tables/views from ordered migrations", report.definedTables);
printList("Used RPCs", report.usedRpcs);
printList("Final SQL functions from ordered migrations", report.definedFunctions);
printList("Used tables/views missing from final schema", report.missingTables);
printList("Used RPCs missing from final schema", report.missingRpcs);
printList("Historical tables/views removed by later migrations", report.removedTables);
printList("Historical functions removed by later migrations", report.removedFunctions);

if (!isBackendMapCurrent) {
  console.error("\ndocs/BACKEND_MAP.md does not match the ordered migration audit.");
  console.error("Run `npm run docs:backend-map` and review the generated diff.");
}

if (report.missingTables.length > 0 || report.missingRpcs.length > 0 || !isBackendMapCurrent) {
  process.exitCode = 1;
}
