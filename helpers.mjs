// Helpers for astro.config.mjs and the settings file (plain Node, no Astro).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { STATE_FILE, defineConfig } from "./lib/config.mjs";
import { parseState } from "./lib/state.mjs";

export { defineConfig };

/**
 * The site's Standard.site publication AT URI from the state file, or
 * undefined before the first publish. For Atmosphere Comments for Astro's
 * Subscribe button:
 *
 *   atmosphereComments({ …, standardSite: { publication: publicationFromState() } })
 */
export function publicationFromState(root = process.cwd()) {
  const file = path.join(root, STATE_FILE);
  if (!existsSync(file)) return undefined;
  return parseState(JSON.parse(readFileSync(file, "utf8"))).formats["standard.site"]?.publication?.uri;
}
