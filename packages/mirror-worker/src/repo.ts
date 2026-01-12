import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type { Event } from "@switchboard/shared";

export async function writeEvent(repoPath: string, event: Event): Promise<void> {
  // Extract date from event.ts (ISO-8601 format)
  const dateStr = event.ts.substring(0, 10); // YYYY-MM-DD
  
  // Build path: events/{feed_id}/{YYYY-MM-DD}/{event_id}.json
  const eventDir = path.join(repoPath, "events", event.feed_id, dateStr);
  
  // Create directories if they don't exist
  if (!fs.existsSync(eventDir)) {
    fs.mkdirSync(eventDir, { recursive: true });
  }
  
  // Write event file with pretty-printed JSON (2-space indent)
  const eventPath = path.join(eventDir, `${event.event_id}.json`);
  fs.writeFileSync(eventPath, JSON.stringify(event, null, 2) + "\n");
}

export async function writeSnapshot(repoPath: string, event: Event): Promise<void> {
  const dateStr = event.ts.substring(0, 10);
  const snapshotDir = path.join(repoPath, "snapshots", event.feed_id, dateStr);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const payload = event.payload as Record<string, unknown>;
  const summary = payload?.summary ?? "Snapshot";
  const body = [
    `# Snapshot ${event.event_id}`,
    ``,
    `- feed: ${event.feed_id}`,
    `- source: ${event.source.platform}/${event.source.adapter_id}`,
    `- ts: ${event.ts}`,
    `- summary: ${summary}`,
    ``,
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
  ].join("\n");

  const snapshotPath = path.join(snapshotDir, `${event.event_id}.md`);
  fs.writeFileSync(snapshotPath, body);
}

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
