import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const mode = process.argv[2] ?? "all";
const allowedModes = new Set(["all", "secrets", "connections", "branding"]);

if (!allowedModes.has(mode)) {
  console.error(`Unknown audit mode: ${mode}`);
  process.exit(2);
}

const ignoredDirs = new Set([
  ".git",
  ".chrome-headless",
  ".edge-headless",
  ".local-quarantine",
  "dist",
  "node_modules",
]);

const sensitiveLocalFiles = [
  ".supabase-secrets.env",
  "supabase/.temp/project-ref",
  "supabase/.temp/linked-project.json",
  "supabase/.temp/pooler-url",
];

const ignoredFiles = new Set([
  "scripts/audit-safety.mjs",
  // `.env.local` is intentionally Git-ignored and is where a deployment's
  // approved backend connection lives. Scan only shareable repository files
  // for accidental URLs or credentials.
  ".env.local",
]);

const checks = {
  secrets: [
    {
      name: "Supabase service role key",
      pattern: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/i,
    },
    {
      name: "Supabase access token",
      pattern: /\bSUPABASE_ACCESS_TOKEN\s*=\s*\S+/i,
    },
    {
      name: "Supabase personal access token",
      pattern: /\bsbp_[A-Za-z0-9_]{20,}\b/,
    },
    {
      name: "Supabase anon key",
      pattern: /\b(?:VITE_)?SUPABASE_ANON_KEY\s*=\s*(?:eyJ|[A-Za-z0-9_-]{80,})/i,
    },
    {
      name: "Mercado Pago token",
      pattern: /\b(?:MERCADOPAGO_ACCESS_TOKEN\s*=\s*\S+|(?:APP_USR|TEST)-[0-9A-Za-z_-]{20,})/i,
    },
    {
      name: "JWT-like secret",
      pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
    },
  ],
  connections: [
    {
      name: "Supabase project URL",
      pattern: /https:\/\/[a-z0-9]{20}\.supabase\.co/i,
    },
    {
      name: "Previous public site URL",
      pattern: /artesanosguemes\.com/i,
    },
  ],
  branding: [
    {
      name: "Previous marketplace name",
      pattern: /los\s+artesanos|artesan@s/i,
    },
    {
      name: "Previous package or asset slug",
      pattern: /\blosartesanos\b|los-artesanos|logo-los-artesanos/i,
    },
    {
      name: "Previous public domain",
      pattern: /artesanosguemes\.com/i,
    },
  ],
};

function toRelative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function shouldScanFile(filePath) {
  const relativePath = toRelative(filePath);

  if (relativePath === "package-lock.json") {
    return false;
  }

  if (ignoredFiles.has(relativePath)) {
    return false;
  }

  return statSync(filePath).size <= 2_000_000;
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

function addLocalFileFindings(findings) {
  if (mode !== "all" && mode !== "secrets" && mode !== "connections") {
    return;
  }

  for (const localFile of sensitiveLocalFiles) {
    const absolutePath = path.join(rootDir, localFile);

    if (existsSync(absolutePath)) {
      findings.push({
        type: "local-file",
        file: localFile,
        line: 1,
        message: "Local secret or Supabase link file exists. Quarantine it before sharing or deriving this repo.",
      });
    }
  }
}

function scanTextFile(filePath, findings) {
  const relativePath = toRelative(filePath);
  let text = "";

  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  if (text.includes("\u0000")) {
    return;
  }

  const lines = text.split(/\r?\n/);
  const activeCheckGroups =
    mode === "all" ? ["secrets", "connections", "branding"] : [mode];

  for (const group of activeCheckGroups) {
    for (const check of checks[group]) {
      for (let index = 0; index < lines.length; index += 1) {
        if (check.pattern.test(lines[index])) {
          findings.push({
            type: group,
            file: relativePath,
            line: index + 1,
            message: check.name,
          });
        }
      }
    }
  }
}

const findings = [];
addLocalFileFindings(findings);

for (const file of collectFiles(rootDir)) {
  scanTextFile(file, findings);
}

if (findings.length === 0) {
  console.log(`audit:${mode} passed`);
  process.exit(0);
}

console.error(`audit:${mode} found ${findings.length} issue(s). Values are intentionally hidden.`);

for (const finding of findings) {
  console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
}

process.exit(1);
