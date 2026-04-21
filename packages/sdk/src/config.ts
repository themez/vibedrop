import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const CONFIG_DIR = join(homedir(), ".vibedrop");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export type Config = {
  apiUrl: string;
  apiKey?: string;
};

const DEFAULTS: Config = {
  apiUrl: process.env.VIBEDROP_API_URL ?? "https://api.vibedrop.cc",
};

export async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveConfig(cfg: Config): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}
