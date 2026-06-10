#!/usr/bin/env node
/**
 * Refreshes vendor/{types,shared} from a built sibling mealnova-shared checkout.
 * The vendored copies (package.json + dist/) are committed so installs work
 * anywhere — CI, Vercel, fresh clones — with no registry token. Run this after
 * changing mealnova-shared:  pnpm vendor:update && pnpm install
 */
import { cp, rm, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const siblingPackages = resolve(repoRoot, "..", "mealnova-shared", "packages");
const vendorDir = resolve(repoRoot, "vendor");

const PACKAGES = ["types", "shared"];

for (const name of PACKAGES) {
  const srcDir = resolve(siblingPackages, name);
  const distDir = resolve(srcDir, "dist");
  try {
    await access(distDir);
  } catch {
    console.error(
      `missing ${distDir} — clone mealnova-shared as a sibling and run "pnpm install && pnpm build" there first.`,
    );
    process.exit(1);
  }

  const destDir = resolve(vendorDir, name);
  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });
  await cp(distDir, resolve(destDir, "dist"), { recursive: true });

  const pkg = JSON.parse(await readFile(resolve(srcDir, "package.json"), "utf8"));
  delete pkg.scripts;
  delete pkg.devDependencies;
  delete pkg.publishConfig;
  if (pkg.dependencies?.["@mealnova/types"]) {
    // workspace:^ ranges only resolve inside the source workspace
    pkg.dependencies["@mealnova/types"] = "file:../types";
  }
  await writeFile(resolve(destDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  console.log(`vendored @mealnova/${name} -> vendor/${name}`);
}
