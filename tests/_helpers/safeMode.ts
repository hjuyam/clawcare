import { promises as fs } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const safeModePath = path.join(dataDir, "safe_mode.json");

// Test helper: toggles Safe Mode by writing data/safe_mode.json.
// If a Safe Mode API is introduced, tests can switch to calling it instead.

type SafeModePayload = {
  enabled: boolean;
  reason?: string;
  updated_at: string;
};

export async function enableSafeMode(reason = "test") {
  await fs.mkdir(dataDir, { recursive: true });
  const payload: SafeModePayload = {
    enabled: true,
    reason,
    updated_at: new Date().toISOString(),
  };
  await fs.writeFile(safeModePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function disableSafeMode() {
  try {
    await fs.unlink(safeModePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

export { safeModePath };
