// Posts announced before the site used this package (by hand, by a release bot
// or by another tool) can name that Bluesky post as their announcement, with
// `announcement:` in their frontmatter (an AT URI or a bsky.app address). It is
// never announced again: the post is linked to it, so its record points to that
// thread (`bskyPostRef`) and comments, likes and reposts carry on there.
const POST = "app.bsky.feed.post";
const AT_URI = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([a-zA-Z0-9._:~-]+)$/;
const BSKY_URL = /^https:\/\/bsky\.app\/profile\/([^/]+)\/post\/([a-zA-Z0-9._:~-]+)\/?$/;

/** The repo (DID or handle) and record key of an AT URI or bsky.app post address, or null. */
export function parseAnnouncement(value) {
  const text = String(value).trim();
  const match = text.match(AT_URI) ?? text.match(BSKY_URL);
  return match ? { repo: decodeURIComponent(match[1]), rkey: match[2] } : null;
}

/** True when the stored announcement is already the one the post names, so nothing needs looking up. */
function alreadyLinked(value, stored) {
  if (!stored) return false;
  const text = String(value).trim().replace(/\/+$/, "");
  return text === stored.uri || text === stored.url;
}

/**
 * Looks up every post's `announcement:` that isn't already linked, through
 * Bluesky's public service. Returns, by post id, either `{ link }` (the
 * announcement to store: `uri`, `cid`, `url`) or `{ problem }` (why that post
 * can't be linked; the rest of the run carries on).
 */
export async function resolveExisting(posts, state, config, agent) {
  const found = {};
  const wanted = [];
  for (const post of posts) {
    if (post.announcement === undefined || post.announcement === null || post.announcement === "") continue;
    if (alreadyLinked(post.announcement, state.announcements[post.id])) continue;
    const parsed = parseAnnouncement(post.announcement);
    if (!parsed) {
      found[post.id] = { problem: `announcement: "${post.announcement}" isn't a Bluesky post's address (at://… or https://bsky.app/profile/…/post/…)` };
      continue;
    }
    wanted.push({ post, ...parsed });
  }
  if (!wanted.length) return found;

  // Handles in bsky.app addresses become DIDs.
  const dids = new Map();
  for (const { repo } of wanted) {
    if (repo.startsWith("did:") || dids.has(repo)) continue;
    try {
      dids.set(repo, (await agent.resolveHandle({ handle: repo })).data.did);
    } catch {
      dids.set(repo, null);
    }
  }
  const uriOf = ({ repo, rkey }) => {
    const did = repo.startsWith("did:") ? repo : dids.get(repo);
    return did ? `at://${did}/${POST}/${rkey}` : null;
  };

  const uris = [...new Set(wanted.map(uriOf).filter(Boolean))];
  const fetched = new Map();
  for (let start = 0; start < uris.length; start += 25) {
    const { data } = await agent.app.bsky.feed.getPosts({ uris: uris.slice(start, start + 25) });
    for (const item of data.posts) fetched.set(item.uri, item);
  }

  for (const entry of wanted) {
    const { post, repo } = entry;
    const uri = uriOf(entry);
    const item = uri && fetched.get(uri);
    if (!uri) found[post.id] = { problem: `announcement: couldn't find the account @${repo}` };
    else if (!item) found[post.id] = { problem: `announcement: ${post.announcement} doesn't exist (deleted, or the address is wrong)` };
    else if (item.author.did !== config.account) {
      found[post.id] = { problem: `announcement: ${post.announcement} is by @${item.author.handle}, not the publishing account (${config.account})` };
    } else {
      found[post.id] = { link: { uri: item.uri, cid: item.cid, url: `https://bsky.app/profile/${item.author.handle}/post/${entry.rkey}` } };
    }
  }
  return found;
}
