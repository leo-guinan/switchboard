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

console.log("Done.");
