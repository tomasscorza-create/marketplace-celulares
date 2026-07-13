import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const thresholdArgument = process.argv.find((argument) => /^\d+$/.test(argument));
const threshold = Number.parseInt(thresholdArgument ?? "1000", 10);
const shouldFail = process.argv.includes("--check");
const targetDirs = ["src", "supabase", "scripts"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".sql"]);
const ignoredDirs = new Set(["node_modules", "dist", ".git", ".temp"]);

function toRelative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function collectFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const rows = [];

for (const dir of targetDirs) {
  const fullDir = path.join(rootDir, dir);

  if (!statSync(fullDir, { throwIfNoEntry: false })?.isDirectory()) {
    continue;
  }

  for (const file of collectFiles(fullDir)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/).length;

    if (lines >= threshold) {
      rows.push({ file: toRelative(file), lines });
    }
  }
}

rows.sort((left, right) => right.lines - left.lines);

if (rows.length === 0) {
  console.log(`No files with ${threshold} lines or more.`);
} else {
  console.table(rows);

  if (shouldFail) {
    console.error(
      `Large-file limit exceeded: split every listed file below ${threshold} lines.`,
    );
    process.exitCode = 1;
  }
}
