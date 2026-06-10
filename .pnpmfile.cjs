// Local-dev convenience: when a sibling mealnova-shared checkout exists,
// consume it via link: instead of the GitHub Packages registry.
// CI/Vercel have no sibling checkout, so this hook is a no-op there and
// the published @mealnova/* packages are used (auth via GITHUB_TOKEN).
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const SIBLING = resolve(__dirname, "..", "mealnova-shared", "packages");
const LOCAL = {
  "@mealnova/types": resolve(SIBLING, "types"),
  "@mealnova/shared": resolve(SIBLING, "shared"),
};

function readPackage(pkg) {
  for (const [name, dir] of Object.entries(LOCAL)) {
    if (pkg.dependencies && pkg.dependencies[name] && existsSync(dir)) {
      pkg.dependencies[name] = `link:${dir}`;
    }
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
