import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const appDir = process.argv[2];

if (!appDir) {
  console.error("Usage: node scripts/clean-next-type-artifacts.mjs <app-dir>");
  process.exit(1);
}

const targetDirs = [
  path.join(appDir, ".next", "types"),
  path.join(appDir, ".next-prod", "types"),
  path.join(appDir, ".next-dev", "types"),
];

const duplicatePattern = /\s\d+\.(ts|json)$/;

for (const dir of targetDirs) {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) continue;

    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && duplicatePattern.test(entry.name))
        .map((entry) => rm(path.join(dir, entry.name), { force: true })),
    );
  } catch {
    // Ignore missing generated directories.
  }
}
