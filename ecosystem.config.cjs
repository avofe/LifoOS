const path = require("path");
const fs = require("fs");

const pnpmDir = path.join(__dirname, "node_modules", ".pnpm");

function findPkgDir(pkg) {
  const entries = fs.readdirSync(pnpmDir);
  const match = entries.find((e) => e.startsWith(`${pkg}@`));
  if (!match) throw new Error(`${pkg} not found in .pnpm`);
  return path.join(pnpmDir, match, "node_modules", pkg);
}

const tsxCli = path.join(findPkgDir("tsx"), "dist", "cli.mjs");
const nextCli = path.join(findPkgDir("next"), "dist", "bin", "next");

module.exports = {
  apps: [
    {
      name: "lifeos-api",
      cwd: path.join(__dirname, "apps", "api"),
      script: tsxCli,
      args: "watch src/index.ts",
      interpreter: "node",
      env: { PORT: 4000 },
    },
    {
      name: "lifeos-web",
      cwd: path.join(__dirname, "apps", "web"),
      script: nextCli,
      args: "dev",
      interpreter: "node",
      env: { PORT: 3000 },
    },
  ],
};
