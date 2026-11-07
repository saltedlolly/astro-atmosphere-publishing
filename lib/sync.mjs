// Rebuilds the state file from the account's own records, for a fresh clone or
// a lost file: finds the site's publication, then matches each document record
// to a post by its address, and each announcement from the record's bskyPostRef.
// Fingerprints aren't stored in records, so every matched post is updated once
// on the next publish (its record rewritten in place, never duplicated).
import { readEntries } from "./entries.mjs";
import { STANDARD_SITE, emptyState } from "./state.mjs";
import { DOCUMENT, PUBLICATION } from "./publishers/standard-site.mjs";

async function listAll(agent, repo, collection) {
  const records = [];
  let cursor;
  do {
    const { data } = await agent.com.atproto.repo.listRecords({ repo, collection, limit: 100, cursor });
    records.push(...data.records);
    cursor = data.cursor;
  } while (cursor);
  return records;
}

/** @returns {Promise<import("../index").State>} */
export async function syncState(config, agent, log = console.log) {
  const state = emptyState();
  const site = state.formats[STANDARD_SITE];
  const strip = (url) => url.replace(/\/+$/, "");
  const publication = (await listAll(agent, config.account, PUBLICATION)).find(
    (record) => strip(String(record.value.url ?? "")) === config.site,
  );
  if (!publication) {
    log(`  No publication record for ${config.site} in the account yet: starting fresh.`);
    return state;
  }
  site.publication = { uri: publication.uri, cid: publication.cid, hash: "" };
  const byPath = new Map((await readEntries(config)).map((post) => [post.path, post]));
  const { data: profile } = await agent.com.atproto.repo.describeRepo({ repo: config.account });
  let matched = 0;
  for (const record of await listAll(agent, config.account, DOCUMENT)) {
    if (record.value.site !== publication.uri) continue;
    const post = byPath.get(record.value.path);
    if (!post) continue;
    site.documents[post.id] = { uri: record.uri, cid: record.cid, hash: "" };
    const ref = record.value.bskyPostRef;
    if (ref?.uri) {
      state.announcements[post.id] = {
        uri: ref.uri,
        cid: ref.cid,
        url: `https://bsky.app/profile/${profile.handle}/post/${ref.uri.split("/").pop()}`,
      };
    }
    matched += 1;
  }
  log(`  Found the publication and ${matched} posts' records.`);
  return state;
}
