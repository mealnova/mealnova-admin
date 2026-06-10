// @mealnova/* resolution strategy:
//   default            -> committed vendor/ copies (file:vendor/...) — works in
//                         CI, Vercel, and fresh clones with no registry token.
//   MEALNOVA_LINK_SHARED=1 -> link: the sibling mealnova-shared checkout for
//                         live local development (build it first). Note this
//                         rewrites the lockfile; don't commit that churn.
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const SIBLING = resolve(__dirname, "..", "mealnova-shared", "packages");
const LOCAL = {
  "@mealnova/types": resolve(SIBLING, "types"),
  "@mealnova/shared": resolve(SIBLING, "shared"),
};

function readPackage(pkg) {
  if (process.env.MEALNOVA_LINK_SHARED !== "1") return pkg;
  for (const [name, dir] of Object.entries(LOCAL)) {
    if (pkg.dependencies && pkg.dependencies[name] && existsSync(dir)) {
      pkg.dependencies[name] = `link:${dir}`;
    }
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
