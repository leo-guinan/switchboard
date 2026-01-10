#!/usr/bin/env npx ts-node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);

const gitFlag = args.includes("--git");
const positionalArgs = args.filter((arg) => arg !== "--git");

if (positionalArgs.length === 0) {
  console.log("Usage: npx ts-node scripts/crp_init.ts <path> [--git]");
  console.log("");
  console.log("Creates a new Context Repo following CRP v0.1 at the specified path.");
  console.log("");
  console.log("Options:");
  console.log("  --git    Initialize git repository and create initial commit");
  process.exit(1);
}

const targetDir = positionalArgs[0];

console.log(`Initializing context repo at: ${targetDir}`);

const directories = ["events", "snapshots", "policy", ".crp"];
const gitkeepDirs = ["events", "snapshots"];

for (const dir of directories) {
  const fullPath = path.join(targetDir, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`  Created ${dir}/`);
}

for (const dir of gitkeepDirs) {
  const gitkeepPath = path.join(targetDir, dir, ".gitkeep");
  fs.writeFileSync(gitkeepPath, "");
}

const readmeContent = `# Context Repo

This repository follows the **Context Repo Protocol (CRP) v0.1**.

## Directory Layout

| Directory | Purpose |
|-----------|---------|
| \`events/\` | Event files organized by feed and date |
| \`snapshots/\` | State snapshots |
| \`policy/\` | Access control policies |
| \`.crp/\` | Repository metadata |

For the full specification, see the CRP v0.1 documentation.
`;

const readmePath = path.join(targetDir, "README.md");
fs.writeFileSync(readmePath, readmeContent);
console.log("  Created README.md");

const policyContent = {
  members: [],
  permissions: {},
};

const policyPath = path.join(targetDir, "policy", "policy.json");
fs.writeFileSync(policyPath, JSON.stringify(policyContent, null, 2) + "\n");
console.log("  Created policy/policy.json");

const manifestContent = {
  version: "0.1",
  created_at: new Date().toISOString(),
};

const manifestPath = path.join(targetDir, ".crp", "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2) + "\n");
console.log("  Created .crp/manifest.json");

if (gitFlag) {
  const absoluteTargetDir = path.resolve(targetDir);
  execSync("git init", { cwd: absoluteTargetDir, stdio: "inherit" });
  execSync("git add -A", { cwd: absoluteTargetDir, stdio: "inherit" });
  execSync('git commit -m "Initialize context repo"', {
    cwd: absoluteTargetDir,
    stdio: "inherit",
  });
  console.log("  Initialized git repository with initial commit");
}

console.log("Done.");
