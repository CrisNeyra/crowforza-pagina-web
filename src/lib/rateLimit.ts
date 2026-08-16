import { cryptoRandomId } from "./security";
import { RATE_LIMIT_CONFIG, type RateLimitKind } from "../constants";

export function checkRateLimit(kind: RateLimitKind): boolean {
  const config = RATE_LIMIT_CONFIG[kind];
  if (!config) return true;

  const now = Date.now();
  const stored = JSON.parse(localStorage.getItem(config.key) || "[]") as number[];
  const recent = stored.filter((timestamp) => now - timestamp < config.windowMs);

  if (recent.length >= config.maxEvents) {
    localStorage.setItem(config.key, JSON.stringify(recent));
    return false;
  }

  recent.push(now);
  localStorage.setItem(config.key, JSON.stringify(recent));
  return true;
}

export function getClientFingerprint(): string {
  const key = "crowforza_client_fp";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const fingerprint = `fp_${Date.now()}_${cryptoRandomId()}`;
  localStorage.setItem(key, fingerprint);
  return fingerprint;
}
