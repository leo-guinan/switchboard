import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export async function initRepo(repoPath: string): Promise<void> {
  // Create repo directory if it doesn't exist
  if (!fs.existsSync(repoPath)) {
    fs.mkdirSync(repoPath, { recursive: true });
    console.log(`Created repo directory: ${repoPath}`);
  }

  // Run git init if .git folder doesn't exist
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) {
    execSync("git init", { cwd: repoPath, stdio: "inherit" });
    console.log("Initialized git repository");
  }

  // Create CRP directory structure
  const directories = ["events", "snapshots", "policy", ".crp"];
  for (const dir of directories) {
    const fullPath = path.join(repoPath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created ${dir}/`);
    }
  }

  // Create .crp/manifest.json if it doesn't exist
  const manifestPath = path.join(repoPath, ".crp", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    const manifestContent = {
      version: "0.1",
      created_at: new Date().toISOString(),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2) + "\n");
    console.log("Created .crp/manifest.json");
  }
}
