// Works out what to publish (preview) and publishes it: the publication
// record, a document record per post, and a Bluesky announcement for new
// posts (or older posts that ask), which becomes the post's comment thread.
import { readEntries } from "./entries.mjs";
import { STANDARD_SITE, isEmpty, readState, saveState } from "./state.mjs";
import { RichText } from "@atproto/api";
import { publicAgent, signIn } from "./account.mjs";
import { syncState } from "./sync.mjs";
import { resolveExisting } from "./existing.mjs";
import {
  DOCUMENT,
  PUBLICATION,
  coverImage,
  documentHash,
  documentRecord,
  publicationHash,
  publicationRecord,
} from "./publishers/standard-site.mjs";

const rkeyOf = (uri) => uri.split("/").pop();

/** The post's own `announce: "…"` wording, or none: the link card alone already shows its title and introduction. */
export const announcementText = (post) => (typeof post.announce === "string" ? post.announce : "");

/**
 * The announcement's text with its @mentions, #hashtags and links marked, as
 * the Bluesky app does, so they're links and mentioned accounts are notified.
 * A mention of a handle that doesn't exist stays plain text.
 */
export async function richTextOf(text, agent) {
  const rich = new RichText({ text });
  try {
    await rich.detectFacets(agent);
  } catch {
    rich.detectFacetsWithoutResolution();
  }
  // A handle that couldn't be found leaves a mention with no account: Bluesky
  // rejects those, so they stay plain text.
  rich.facets = (rich.facets ?? []).filter(
    (facet) => !facet.features.some((feature) => feature.$type === "app.bsky.richtext.facet#mention" && !feature.did),
  );
  return rich;
}

/** What the announcement's text will link, for the preview. */
export function linkedParts(rich, text) {
  const bytes = new TextEncoder().encode(text);
  const decode = (start, end) => new TextDecoder().decode(bytes.slice(start, end));
  return (rich.facets ?? []).map((facet) => decode(facet.index.byteStart, facet.index.byteEnd));
}

/** New posts are announced with today's date, so followers see them. */
export const isNew = (post, config) =>
  !post.archived && (Date.now() - post.publishedAt.valueOf()) / 86_400_000 <= config.announceWithinDays;

/**
 * Older posts are announced only when they ask, dated to the post itself: Bluesky
 * files them in the past and they don't reach followers' timelines, but replies
 * still appear under the article.
 */
export const announcementDate = (post, config) => (isNew(post, config) ? new Date() : post.publishedAt);

export function wantsAnnouncement(post, state, config) {
  // A post that names an existing announcement is linked to it, never announced.
  if (post.announcement !== undefined) return false;
  if (post.announce === false) return false;
  if (state.announcements[post.id]) return false;
  if (post.announce !== undefined) return true;
  return isNew(post, config);
}

/** Lines that only inform, rather than list something to publish. */
export const isNotice = (line) => line.startsWith("note:") || line.startsWith("problem:");

/**
 * What would change, without changing anything. `agent` looks up posts that
 * name an existing announcement (Bluesky's public service will do).
 */
export async function plan(config, state = readState(config.stateFile), agent = publicAgent()) {
  const posts = await readEntries(config);
  const existing = await resolveExisting(posts, state, config, agent);
  const site = state.formats[STANDARD_SITE];
  const pubHash = await publicationHash(config);
  const publicationChange = !site.publication ? "create" : site.publication.hash !== pubHash ? "update" : null;
  const changes = [];
  const problems = [];
  for (const post of posts) {
    const document = site.documents[post.id];
    const announce = wantsAnnouncement(post, state, config);
    // A newly named existing announcement replaces what's stored; one that
    // can't be used leaves the stored one (if any) as it is.
    const { link, problem } = existing[post.id] ?? {};
    if (problem) problems.push({ post, problem });
    const announcement = link ?? state.announcements[post.id] ?? null;
    const hash = await documentHash(post, site.publication?.uri ?? "", announcement);
    if (!document) changes.push({ post, action: "create", announce, link });
    else if (announce || link || document.hash !== hash) changes.push({ post, action: "update", announce, link });
  }
  const known = new Set(posts.map((post) => post.id));
  const orphans = Object.keys(site.documents).filter((id) => !known.has(id));
  // Posts linked to the same announcement, which is allowed but usually a slip.
  const byUri = new Map();
  for (const post of posts) {
    const uri = (existing[post.id]?.link ?? state.announcements[post.id])?.uri;
    if (uri) byUri.set(uri, [...(byUri.get(uri) ?? []), post.id]);
  }
  const shared = [...byUri].filter(([, ids]) => ids.length > 1);
  return { posts, state, pubHash, publicationChange, changes, problems, shared, orphans };
}

/** The plan in plain words, as the preview prints it. `linked` lists, by post id, what each announcement will link. */
export function describe(result, config, handle, linked = {}) {
  const lines = [];
  if (result.publicationChange) lines.push(`${result.publicationChange} the publication record (${config.site})`);
  for (const { post, action, announce, link } of result.changes) {
    lines.push(`${action} the document for ${post.path}`);
    if (link) {
      const previous = result.state.announcements[post.id];
      lines.push(
        `linked to existing announcement: ${link.url}` +
          (previous ? ` (was ${previous.url}; nothing is deleted on Bluesky)` : " (not announced again)"),
      );
    }
    if (!announce) continue;
    const text = announcementText(post);
    lines.push(
      `announce it on Bluesky${handle ? ` as @${handle}` : ""} (${[...text].length}/300 characters), ` +
        (isNew(post, config)
          ? "dated now:\n"
          : `backdated to ${post.publishedAt.toISOString()} (an older post: it won't reach followers' timelines):\n`) +
        "    ┌────────────────────────────────────────\n" +
        (text ? text.split("\n").map((line) => `    │ ${line}`).join("\n") : "    │ (no announce: wording, so no text: just the link card)") +
        `\n    │ [link card: ${post.title} — ${post.url}]\n` +
        "    └────────────────────────────────────────\n" +
        (text ? `    Linked: ${linked[post.id]?.length ? linked[post.id].join(", ") : "nothing (no @mentions, #hashtags or links found)"}\n` : "") +
        `    To change the wording, add  announce: "…"  to ${post.source};\n` +
        "    announce: false  skips the announcement.",
    );
  }
  for (const { post, problem } of result.problems) {
    const kept = result.state.announcements[post.id];
    lines.push(
      `problem: ${post.source}: ${problem}. ` +
        (kept ? `It keeps its current announcement (${kept.url})` : "Its record is published without an announcement") +
        "; everything else carries on.",
    );
  }
  for (const [uri, ids] of result.shared) lines.push(`note: ${ids.join(" and ")} have the same announcement (${uri}), so they share one comment thread`);
  for (const id of result.orphans) lines.push(`note: ${id} has a record but no post (or is now a draft); it was left alone`);
  return lines;
}

/** What each planned announcement will link, by post id (mentions are checked with `agent`). */
export async function linkedFor(result, agent) {
  const linked = {};
  for (const { post, announce } of result.changes) {
    const text = announcementText(post);
    if (announce && text) linked[post.id] = linkedParts(await richTextOf(text, agent), text);
  }
  return linked;
}

/** Publishes everything the plan lists. Saves the state file after each record, so an interruption loses nothing. */
export async function publish(config, log = console.log) {
  const agent = await signIn(config.account);
  let state = readState(config.stateFile);
  // A missing or empty state file is rebuilt from the account first, so it can never cause duplicates.
  if (isEmpty(state)) {
    log("The state file is missing or empty: rebuilding it from the account first.");
    state = await syncState(config, agent, log);
    await saveState(config.stateFile, state);
  }
  const result = await plan(config, state, agent);
  const lines = describe(result, config, agent.session.handle, await linkedFor(result, agent));
  if (!lines.some((line) => !isNotice(line))) {
    for (const line of lines) log(`  • ${line}`);
    log("Everything is already published and up to date.");
    return result;
  }
  log("Publishing:");
  for (const line of lines) log(`  • ${line}`);

  const did = agent.session.did;
  const site = state.formats[STANDARD_SITE];
  const upload = async (data, encoding) => (await agent.uploadBlob(data, { encoding })).data.blob;
  const write = async (collection, record, existingUri) => {
    const response = existingUri
      ? await agent.com.atproto.repo.putRecord({ repo: did, collection, rkey: rkeyOf(existingUri), record })
      : await agent.com.atproto.repo.createRecord({ repo: did, collection, record });
    return { uri: response.data.uri, cid: response.data.cid };
  };

  if (result.publicationChange) {
    const ref = await write(PUBLICATION, await publicationRecord(config, upload), site.publication?.uri);
    site.publication = { ...ref, hash: result.pubHash };
    await saveState(config.stateFile, state);
    log(`  ✓ publication: ${ref.uri}`);
  }
  const publicationUri = site.publication.uri;

  // Announcing first, so the document record can point at the Bluesky thread.
  for (const { post, announce, link } of result.changes) {
    if (link) {
      // Stored exactly as if it had been announced here.
      state.announcements[post.id] = link;
      await saveState(config.stateFile, state);
      log(`  ✓ linked to existing announcement: ${link.url}`);
    }
    const cover = post.coverFile ? await upload(await coverImage(post.coverFile), "image/jpeg") : undefined;
    if (announce) {
      const rich = await richTextOf(announcementText(post), agent);
      const created = await agent.post({
        text: rich.text,
        ...(rich.facets?.length && { facets: rich.facets }),
        langs: config.langs,
        createdAt: announcementDate(post, config).toISOString(),
        embed: { $type: "app.bsky.embed.external", external: { uri: post.url, title: post.title, description: post.description, thumb: cover } },
      });
      state.announcements[post.id] = {
        uri: created.uri,
        cid: created.cid,
        url: `https://bsky.app/profile/${agent.session.handle}/post/${rkeyOf(created.uri)}`,
      };
      await saveState(config.stateFile, state);
      log(`  ✓ announced: ${state.announcements[post.id].url}`);
    }
    const announcement = state.announcements[post.id] ?? null;
    const ref = await write(DOCUMENT, documentRecord(post, publicationUri, cover, announcement), site.documents[post.id]?.uri);
    site.documents[post.id] = { ...ref, hash: await documentHash(post, publicationUri, announcement) };
    await saveState(config.stateFile, state);
    log(`  ✓ document: ${post.path}`);
  }
  log("\nDone. Commit src/data/atmosphere-publishing.json, then build and deploy.");
  return result;
}
