#!/usr/bin/env npx ts-node

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: npx ts-node scripts/crp_init.ts <path>");
  console.log("");
  console.log("Creates a new Context Repo following CRP v0.1 at the specified path.");
  process.exit(1);
}

const targetDir = args[0];

console.log(`Initializing context repo at: ${targetDir}`);
