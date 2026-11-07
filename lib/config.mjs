// The settings, from atmosphere-publishing.config.mjs at the project's root.
// Read by both the command (bin/cli.mjs) and the Astro integration (index.mjs),
// so they always agree.
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const CONFIG_FILE = "atmosphere-publishing.config.mjs";
export const STATE_FILE = "src/data/atmosphere-publishing.json";

const DID = /^did:[a-z0-9]+:[a-zA-Z0-9._:%-]+$/;

/** For the settings file: `export default defineConfig({ … })`, which only checks and returns them. */
export const defineConfig = (config) => config;

/**
 * Loads and checks the settings. `root` is the project's folder.
 * @returns {Promise<import("../index").ResolvedConfig>}
 */
export async function loadConfig(root = process.cwd()) {
  const file = path.join(root, CONFIG_FILE);
  if (!existsSync(file)) throw new Error(`No ${CONFIG_FILE} found in ${root}. See the README to create one.`);
  // A fresh import each time, so the dev server sees changes.
  const { default: config } = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const problems = [];
  if (!config?.site || !/^https?:\/\//.test(config.site)) problems.push("`site` must be your site's address, e.g. https://example.com");
  if (!DID.test(config?.account ?? "")) problems.push("`account` must be the DID of the account that publishes (did:plc:… or did:web:…)");
  if (!config?.publication?.name) problems.push("`publication.name` is required");
  if (!config?.collections?.length) problems.push("`collections` must list at least one collection");
  for (const [index, collection] of (config?.collections ?? []).entries()) {
    if (!collection.files) problems.push(`collections[${index}].files must be a glob such as "src/content/blog/**/*.md"`);
    if (typeof collection.path !== "function") problems.push(`collections[${index}].path must be a function giving each post's address`);
  }
  if (problems.length) throw new Error(`${CONFIG_FILE}:\n  - ${problems.join("\n  - ")}`);
  return {
    root,
    site: config.site.replace(/\/+$/, ""),
    account: config.account,
    publication: { description: "", ...config.publication },
    collections: config.collections,
    announceWithinDays: config.announceWithinDays ?? 14,
    langs: config.langs ?? ["en"],
    stateFile: path.join(root, STATE_FILE),
  };
}
