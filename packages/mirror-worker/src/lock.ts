import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

interface LockData {
  instance_id: string;
  started_at: string;
  last_heartbeat: string;
}

const LOCK_STALE_THRESHOLD_MS = 60000; // 60 seconds

export function acquireLock(repoPath: string): string {
  const lockPath = path.join(repoPath, ".crp", "lock.json");
  const instanceId = randomUUID();
  const now = new Date().toISOString();

  // Check for existing lock
  if (fs.existsSync(lockPath)) {
    try {
      const existingLock: LockData = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
      const lastHeartbeat = new Date(existingLock.last_heartbeat).getTime();
      const age = Date.now() - lastHeartbeat;

      if (age < LOCK_STALE_THRESHOLD_MS) {
        console.warn(
          `Warning: Lock exists with recent heartbeat (${Math.round(age / 1000)}s old). ` +
          `Another instance (${existingLock.instance_id}) may be running.`
        );
      }
    } catch {
      // Ignore parse errors, we'll overwrite the lock
    }
  }

  // Create/update lock file
  const lockData: LockData = {
    instance_id: instanceId,
    started_at: now,
    last_heartbeat: now,
  };

  // Ensure .crp directory exists
  const crpDir = path.join(repoPath, ".crp");
  if (!fs.existsSync(crpDir)) {
    fs.mkdirSync(crpDir, { recursive: true });
  }

  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + "\n");
  console.log(`Acquired lock: ${instanceId}`);

  return instanceId;
}

export function updateHeartbeat(repoPath: string): void {
  const lockPath = path.join(repoPath, ".crp", "lock.json");

  if (!fs.existsSync(lockPath)) {
    console.warn("Lock file not found, cannot update heartbeat");
    return;
  }

  try {
    const lockData: LockData = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    lockData.last_heartbeat = new Date().toISOString();
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + "\n");
  } catch (err) {
    console.error("Failed to update heartbeat:", err);
  }
}
