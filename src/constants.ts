export const LS_KEYS = {
  theme: "theme",
  cart: "crowforza_cart",
  user: "crowforza_user",
} as const;

export const RATE_LIMIT_CONFIG = {
  contact: { key: "crowforza_rl_contact", maxEvents: 2, windowMs: 2 * 60 * 1000 },
  newsletter: { key: "crowforza_rl_newsletter", maxEvents: 4, windowMs: 2 * 60 * 1000 },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMIT_CONFIG;
