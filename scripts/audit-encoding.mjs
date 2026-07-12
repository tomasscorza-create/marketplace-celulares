import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const ignoredDirs = new Set([
  ".git",
  ".chrome-headless",
  ".edge-headless",
  ".local-quarantine",
  "dist",
  "node_modules",
]);
const ignoredFiles = new Set(["package-lock.json"]);
const scannedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const mojibakePattern = /(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2[\u0080-\uffff]{1,2}|\ufffd)/g;

function toRelative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function shouldScanFile(filePath) {
  const relativePath = toRelative(filePath);
  const extension = path.extname(filePath);

  if (ignoredFiles.has(relativePath)) {
    return false;
  }

  return scannedExtensions.has(extension) && statSync(filePath).size <= 2_000_000;
}

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (entry.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];

for (const file of collectFiles(rootDir)) {
  const relativePath = toRelative(file);
  let text = "";

  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (text.includes("\u0000")) {
    continue;
  }

  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    if (mojibakePattern.test(lines[index])) {
      findings.push({
        file: relativePath,
        line: index + 1,
      });
    }

    mojibakePattern.lastIndex = 0;
  }
}

if (findings.length === 0) {
  console.log("audit:encoding passed");
  process.exit(0);
}

console.error(`audit:encoding found ${findings.length} suspicious line(s).`);

for (const finding of findings) {
  console.error(`- ${finding.file}:${finding.line}`);
}

process.exit(1);
