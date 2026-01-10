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

describe("Integration: Mirror worker flow", () => {
  let tempDir: string;
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

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-test-"));

    const feedRes = await apiFetch("/feeds", {
      method: "POST",
      body: { name: `mirror-test-${Date.now()}` },
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

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("starts mirror process and posts 3 events", async () => {
    const packageRoot = path.resolve(__dirname, "../..");
    execSync("npm run build", { cwd: packageRoot, stdio: "inherit" });

    execSync("git init", { cwd: tempDir, stdio: "inherit" });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: "inherit" });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: "inherit" });

    mirrorProcess = spawn("node", ["dist/index.js"], {
      cwd: packageRoot,
      env: {
        ...process.env,
        RELAY_URL: BASE_URL,
        FEED_IDS: feedId,
        CONTEXT_REPO_PATH: tempDir,
        COMMIT_BATCH_SIZE: "3",
        COMMIT_BATCH_TIMEOUT_MS: "2000",
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

    for (let i = 0; i < 3; i++) {
      const eventId = randomUUID();
      eventIds.push(eventId);

      const eventPayload = {
        event_id: eventId,
        feed_id: feedId,
        type: "test.mirror.event",
        author_identity_id: "test-author-123",
        source: {
          platform: "test-platform",
          adapter_id: "test-adapter",
          source_msg_id: null,
        },
        ts: eventTs,
        payload: { message: `Event ${i + 1}`, index: i },
      };

      const res = await apiFetch(`/feeds/${feedId}/events`, {
        method: "POST",
        body: eventPayload,
      });

      expect(res.status).toBe(201);
    }

    expect(eventIds.length).toBe(3);
  }, 30000);

  it("verifies 3 event files exist in correct CRP paths", async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const dateStr = new Date().toISOString().substring(0, 10);
    const eventsDir = path.join(tempDir, "events", feedId, dateStr);

    expect(fs.existsSync(eventsDir)).toBe(true);

    for (const eventId of eventIds) {
      const eventPath = path.join(eventsDir, `${eventId}.json`);
      expect(fs.existsSync(eventPath)).toBe(true);

      const content = fs.readFileSync(eventPath, "utf-8");
      const event = JSON.parse(content);
      expect(event.event_id).toBe(eventId);
      expect(event.feed_id).toBe(feedId);
      expect(event.type).toBe("test.mirror.event");
    }
  }, 15000);

  it("verifies git log shows commit(s)", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const gitLog = execSync("git log --oneline", {
      cwd: tempDir,
      encoding: "utf-8",
    });

    expect(gitLog).toContain("Mirror:");
    expect(gitLog.length).toBeGreaterThan(0);
  }, 10000);
});
