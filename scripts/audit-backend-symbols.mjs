import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function collectFiles(dir, extensions) {
  const entries = readdirSync(path.join(rootDir, dir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, dir, entry.name);
    const relativePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(relativePath, extensions));
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function sorted(set) {
  return [...set].sort();
}

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

const appFiles = [
  ...collectFiles("src", new Set([".ts", ".tsx"])),
  ...collectFiles("supabase/functions", new Set([".ts"])),
];
const sqlFiles = collectFiles("supabase/sql", new Set([".sql"]));

const usedTables = new Set();
const usedRpc = new Set();
const definedTables = new Set();
const definedFunctions = new Set();

for (const file of appFiles) {
  const source = readFileSync(file, "utf8");

  for (const match of source.matchAll(/\.from\("([^"]+)"\)/g)) {
    usedTables.add(match[1]);
  }

  for (const match of source.matchAll(/\.rpc\("([^"]+)"/g)) {
    usedRpc.add(match[1]);
  }
}

for (const file of sqlFiles) {
  const source = readFileSync(file, "utf8");

  for (const match of source.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/gi)) {
    definedTables.add(match[1]);
  }

  for (const match of source.matchAll(/create\s+or\s+replace\s+view\s+public\.([a-z0-9_]+)/gi)) {
    definedTables.add(match[1]);
  }

  for (const match of source.matchAll(/create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)/gi)) {
    definedFunctions.add(match[1]);
  }
}

const usedTablesNotDefined = sorted(new Set(sorted(usedTables).filter((name) => !definedTables.has(name))));
const usedRpcNotDefined = sorted(new Set(sorted(usedRpc).filter((name) => !definedFunctions.has(name))));
const definedFunctionsNotUsedDirectly = sorted(
  new Set(sorted(definedFunctions).filter((name) => !usedRpc.has(name))),
);

printList("Used tables/views", sorted(usedTables));
printList("Defined tables/views", sorted(definedTables));
printList("Used RPCs", sorted(usedRpc));
printList("Defined SQL functions", sorted(definedFunctions));
printList("Used tables/views missing from SQL", usedTablesNotDefined);
printList("Used RPCs missing from SQL", usedRpcNotDefined);
printList("Defined SQL functions not called directly from app/functions", definedFunctionsNotUsedDirectly);

if (usedTablesNotDefined.length > 0 || usedRpcNotDefined.length > 0) {
  process.exitCode = 1;
}
