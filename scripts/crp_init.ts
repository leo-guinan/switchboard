#!/usr/bin/env npx ts-node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);

const gitFlag = args.includes("--git");
const ciFlag = args.includes("--ci");
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

if (positionalArgs.length === 0) {
  console.log("Usage: npx ts-node scripts/crp_init.ts <path> [--git] [--ci]");
  console.log("");
  console.log("Creates a new Context Repo following CRP v0.1 at the specified path.");
  console.log("");
  console.log("Options:");
  console.log("  --git    Initialize git repository and create initial commit");
  console.log("  --ci     Include CI workflow and append-only check script");
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

if (ciFlag) {
  const workflowsDir = path.join(targetDir, ".github", "workflows");
  fs.mkdirSync(workflowsDir, { recursive: true });
  console.log("  Created .github/workflows/");

  const workflowContent = `name: Append-Only Guard

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

jobs:
  check-append-only:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check append-only events
        run: ./scripts/check-append-only.sh origin/main
`;
  const workflowPath = path.join(workflowsDir, "append-only-guard.yml");
  fs.writeFileSync(workflowPath, workflowContent);
  console.log("  Created .github/workflows/append-only-guard.yml");

  const scriptsDir = path.join(targetDir, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });

  const checkScriptContent = `#!/bin/bash
#
# check-append-only.sh
# Validates that event files are only added, never modified or deleted.
# Usage: ./scripts/check-append-only.sh <base-ref>
# Example: ./scripts/check-append-only.sh origin/main

set -e

BASE_REF="\${1:-origin/main}"

if [ -z "$1" ]; then
  echo "Usage: $0 <base-ref>"
  echo "Example: $0 origin/main"
  exit 1
fi

violations=()

while IFS=$'\\t' read -r status filepath; do
  case "$filepath" in
    events/*)
      if [ "$status" = "M" ] || [ "$status" = "D" ]; then
        violations+=("$status\\t$filepath")
      fi
      ;;
  esac
done < <(git diff --name-status "$BASE_REF"..HEAD)

if [ \${#violations[@]} -gt 0 ]; then
  echo "ERROR: Append-only violation detected!"
  echo "Files under events/ must only be added, never modified or deleted."
  echo ""
  echo "Offending files:"
  for v in "\${violations[@]}"; do
    echo "  $v"
  done
  exit 1
fi

echo "Append-only check passed. All event file changes are additions."
exit 0
`;
  const checkScriptPath = path.join(scriptsDir, "check-append-only.sh");
  fs.writeFileSync(checkScriptPath, checkScriptContent, { mode: 0o755 });
  console.log("  Created scripts/check-append-only.sh (executable)");
}

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
