import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync, spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function apiFetch(
  path: string,
  options: { method?: string; body?: object } = {}
): Promise<Response> {
  const url = new URL(path, BASE_URL);
  return globalThis.fetch(url.toString(), {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Integration: GitHub push flow", () => {
  let workDir: string;
  let bareRemoteDir: string;
  let feedId: string;
  let mirrorProcess: ChildProcess;
  const eventIds: string[] = [];

  beforeAll(async () => {
    const healthRes = await apiFetch("/health");
    if (healthRes.status !== 200) {
      throw new Error(
        "Relay API not healthy. Make sure docker compose is running."
      );
    }

    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "github-push-test-"));
    workDir = path.join(tmpBase, "work");
    bareRemoteDir = path.join(tmpBase, "remote.git");

    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(bareRemoteDir, { recursive: true });

    execSync("git init --bare", { cwd: bareRemoteDir, stdio: "inherit" });

    execSync("git init", { cwd: workDir, stdio: "inherit" });
    execSync('git config user.email "test@example.com"', { cwd: workDir, stdio: "inherit" });
    execSync('git config user.name "Test User"', { cwd: workDir, stdio: "inherit" });

    fs.writeFileSync(path.join(workDir, ".gitkeep"), "");
    execSync("git add -A", { cwd: workDir, stdio: "inherit" });
    execSync('git commit -m "Initial commit"', { cwd: workDir, stdio: "inherit" });
    execSync(`git remote add origin ${bareRemoteDir}`, { cwd: workDir, stdio: "inherit" });
    execSync("git push -u origin main", { cwd: workDir, stdio: "inherit" });

    const feedRes = await apiFetch("/feeds", {
      method: "POST",
      body: { name: `github-push-test-${Date.now()}` },
    });

    if (feedRes.status !== 201) {
      throw new Error(`Failed to create feed: ${await feedRes.text()}`);
    }

    const feedData = await feedRes.json();
    feedId = feedData.id;
  }, 30000);

  afterAll(async () => {
    if (mirrorProcess && !mirrorProcess.killed) {
      mirrorProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (workDir) {
      const tmpBase = path.dirname(workDir);
      if (fs.existsSync(tmpBase)) {
        fs.rmSync(tmpBase, { recursive: true, force: true });
      }
    }
  });

  it("pushes commits to remote after events are received", async () => {
    const packageRoot = path.resolve(__dirname, "../..");
    execSync("npm run build", { cwd: packageRoot, stdio: "inherit" });

    mirrorProcess = spawn("node", ["dist/index.js"], {
      cwd: packageRoot,
      env: {
        ...process.env,
        RELAY_URL: BASE_URL,
        FEED_IDS: feedId,
        CONTEXT_REPO_PATH: workDir,
        COMMIT_BATCH_SIZE: "2",
        COMMIT_BATCH_TIMEOUT_MS: "1000",
        GITHUB_PAT: "fake-pat-for-local-test",
        GITHUB_REPO_URL: `file://${bareRemoteDir}`,
        GITHUB_BRANCH: "main",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    mirrorProcess.stdout?.on("data", (data) => {
      console.log(`[mirror] ${data.toString().trim()}`);
    });
    mirrorProcess.stderr?.on("data", (data) => {
      console.error(`[mirror-err] ${data.toString().trim()}`);
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const eventTs = new Date().toISOString();

    for (let i = 0; i < 2; i++) {
      const eventId = randomUUID();
      eventIds.push(eventId);

      const eventPayload = {
        event_id: eventId,
        feed_id: feedId,
        type: "test.github.push",
        author_identity_id: "test-author-456",
        source: {
          platform: "test-platform",
          adapter_id: "test-adapter",
          source_msg_id: null,
        },
        ts: eventTs,
        payload: { message: `GitHub push event ${i + 1}`, index: i },
      };

      const res = await apiFetch(`/feeds/${feedId}/events`, {
        method: "POST",
        body: eventPayload,
      });

      expect(res.status).toBe(201);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(eventIds.length).toBe(2);
  }, 30000);

  it("verifies commit was pushed to remote (git log on bare repo)", async () => {
    const remoteLog = execSync("git log --oneline main", {
      cwd: bareRemoteDir,
      encoding: "utf-8",
    });

    expect(remoteLog).toContain("Mirror:");
  }, 10000);

  it("verifies event files exist in remote", async () => {
    const checkoutDir = fs.mkdtempSync(path.join(os.tmpdir(), "remote-checkout-"));

    try {
      execSync(`git clone ${bareRemoteDir} .`, { cwd: checkoutDir, stdio: "inherit" });

      const feedEventsDir = path.join(checkoutDir, "events", feedId);
      expect(fs.existsSync(feedEventsDir)).toBe(true);
      
      const dateDirs = fs.readdirSync(feedEventsDir);
      expect(dateDirs.length).toBeGreaterThan(0);
      
      const eventsDir = path.join(feedEventsDir, dateDirs[0]);

      for (const eventId of eventIds) {
        const eventPath = path.join(eventsDir, `${eventId}.json`);
        expect(fs.existsSync(eventPath)).toBe(true);

        const content = fs.readFileSync(eventPath, "utf-8");
        const event = JSON.parse(content);
        expect(event.event_id).toBe(eventId);
        expect(event.feed_id).toBe(feedId);
        expect(event.type).toBe("test.github.push");
      }
    } finally {
      fs.rmSync(checkoutDir, { recursive: true, force: true });
    }
  }, 15000);
});
