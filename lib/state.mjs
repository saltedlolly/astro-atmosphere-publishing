// The state file (src/data/atmosphere-publishing.json): what has been published.
// Committed to the repository; the site reads it at build time for each page's
// <link> tag and comment thread. If it is missing or empty, `publish` first
// rebuilds it from the account (lib/sync.mjs), so it can never cause duplicates.
//
// Layout (version 1):
//   {
//     "version": 1,
//     "announcements": { "<post id>": { uri, cid, url } },   shared by every format
//     "formats": {
//       "standard.site": {
//         "publication": { uri, cid, hash },
//         "documents": { "<post id>": { uri, cid, hash } }
//       }
//     }
//   }
// Each format keeps its own section, so formats added later never disturb
// the others. `version` lets a later release convert older files.
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const STATE_VERSION = 1;
export const STANDARD_SITE = "standard.site";

/** @returns {import("../index").State} */
export const emptyState = () => ({
  version: STATE_VERSION,
  announcements: {},
  formats: { [STANDARD_SITE]: { publication: null, documents: {} } },
});

/**
 * Converts saltedlolly.com's earlier layout ({ publication, documents } with
 * each document's announcement inside it) into version 1.
 */
function fromEarlierLayout(old) {
  const state = emptyState();
  state.formats[STANDARD_SITE].publication = old.publication ?? null;
  for (const [id, { announcement, ...document }] of Object.entries(old.documents ?? {})) {
    state.formats[STANDARD_SITE].documents[id] = document;
    if (announcement) state.announcements[id] = announcement;
  }
  return state;
}

export function parseState(data) {
  if (!data.version) return fromEarlierLayout(data);
  if (data.version > STATE_VERSION) {
    throw new Error("The state file was written by a newer version of Atmosphere Publishing. Update the package first.");
  }
  const state = emptyState();
  state.announcements = data.announcements ?? {};
  state.formats = { ...state.formats, ...data.formats };
  return state;
}

export function readState(file) {
  return existsSync(file) ? parseState(JSON.parse(readFileSync(file, "utf8"))) : emptyState();
}

export const isEmpty = (state) =>
  !Object.keys(state.announcements).length &&
  Object.values(state.formats).every((format) => !format.publication && !Object.keys(format.documents ?? {}).length);

export async function saveState(file, state) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`);
}
