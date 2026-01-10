#!/usr/bin/env npx ts-node

import * as fs from "fs";
import * as path from "path";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: npx ts-node scripts/crp_init.ts <path>");
  console.log("");
  console.log("Creates a new Context Repo following CRP v0.1 at the specified path.");
  process.exit(1);
}

const targetDir = args[0];

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

console.log("Done.");
