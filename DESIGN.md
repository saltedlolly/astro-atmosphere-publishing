# Atmosphere Publishing for Astro: design

Status: agreed with Olly, 7 November 2026; version 0.1.0 built (not released).

**Publish your Astro site to the Atmosphere with [Standard.site](https://standard.site).** Atmosphere Publishing for Astro turns your Astro content collections into Standard.site records in your own AT Protocol account, announces new posts on Bluesky, and links each page to its records, so apps such as Leaflet, Standard Reader and Bluesky can find, show and subscribe to your writing. It pairs with [Atmosphere Comments for Astro](https://github.com/saltedlolly/astro-atmosphere-comments): together, every post gets a comment section with no extra setup.

Standard.site is the first format it publishes. The design leaves room for others later (see "More than Standard.site").

## Why build it

What exists today (checked 7 November 2026):

| Tool | What it is | What it doesn't do |
| --- | --- | --- |
| [Sequoia](https://sequoia.pub) (`sequoia-cli`, MIT, Steve Simkins, ~2,300 downloads a month) | A command-line tool for any static site: publishes Standard.site documents from Markdown, posts to Bluesky and links the post as `bskyPostRef`, writes `<link>` tags into the built HTML, keeps a state file and can rebuild it from your account. Includes comments (read-only Bluesky replies), Subscribe and Recommend web components. | Not an Astro integration: it reads Markdown files and edits the built HTML, so on-demand (server-rendered) pages are missed. Bluesky posts are always title, description and link, with no per-post wording. Old posts are only skipped (`maxAgeDays`), never announced with a backdated date. |
| [`@kckempf/astro-standard-site`](https://github.com/kckempf/astro-standard-site) (fork of `@bryanguffey/astro-standard-site`, ~900 downloads a month each) | A library: you call `publishDocument()` from your own script; includes a loader for reading records and a Bluesky comments component. | No Bluesky announcements: you create each post by hand and paste its address into the post. No state, CLI or CI step. |

Sequoia is a good tool, and **Atmosphere Comments already works with it**: it finds the announcement through the `<link rel="site.standard.document">` tag and `bskyPostRef` that Sequoia writes. That should go in the Atmosphere Comments README whatever we decide here.

What this package adds, from saltedlolly.com's own script (`scripts/atproto-publish.mts`), which has published 103 posts:

- **Made for Astro.** It uses the site's own address rules (the functions its pages already use), and the `<link>` tags are rendered into every page by a component, prerendered or not. (The `preview` and `publish` commands read the Markdown files directly, because Astro only lets code read collections while the site is running or building; the settings file names the same folder and rules.)
- **Announcements written per post** (`announce: "…"`), shown above the link card. Without wording, the card alone, so nothing is repeated.
- **Older posts can still get a comment thread:** announced only when the post asks, and dated to the post itself, so they don't reach followers' timelines.
- **Made to pair with Atmosphere Comments,** tested together on every release.

## How the two integrations work together

They never depend on each other. They meet only through the standard:

| Setup | What you get |
| --- | --- |
| Atmosphere Comments alone | Comments wherever you give it a Bluesky post (as now). |
| Atmosphere Publishing alone | Standard.site records, announcements and `<link>` tags. Works with any comments system, or none. |
| Both | Comments appear on every announced post automatically; Subscribe and recommending turn on with one line (`standardSite: { publication: publicationFromState() }`). |

The connections:

1. Each page gets `<link rel="site.standard.document" href="at://…">`. Atmosphere Comments already reads this to find the announcement (`bskyPostRef`) and to recommend the post.
2. The site serves `/.well-known/site.standard.publication`, which reader apps use to confirm the site owns the publication.
3. For Subscribe, the site passes the publication to Atmosphere Comments in one line: `standardSite: { publication: publicationFromState() }` (a helper from this package that reads its state file at build time).
4. Neither package imports the other. A site can swap either one for something else.

## What version 1 does

### Records

| Record | From | Notes |
| --- | --- | --- |
| `site.standard.publication` | The integration's options: name, description, icon, site address | One per site. |
| `site.standard.document` | Each entry in the chosen collections | `title`, `path`, `description`, `textContent` (plain text, for search), `tags`, `publishedAt`, `updatedAt`, `coverImage` (a JPEG under 1 MB, made from the hero), `bskyPostRef`. |
| `app.bsky.feed.post` (the announcement) | `announce:` wording, plus a link card | Optional. Becomes the comment thread. |

Records are created or updated only when something changed (a hash of each record's fields), so running it on every deploy is cheap. Deleted posts are reported, never deleted automatically.

### Announcements

- **New posts** (within `announceWithinDays`, default 14) are announced, dated now. The text is the post's `announce:` wording, or nothing, leaving the link card alone.
- **Older posts** are announced only with `announce: "…"` (or `announce: true` for the card alone), dated to the post's own date.
- `announce: false` never announces.
- **Posts already announced elsewhere** (added in 0.2.0, for diginode.tools' release notes, 8 November 2026): `announcement: "at://…"` (or a bsky.app address, or a collection's `announcement` function) links the post to an existing Bluesky post by the publishing account. It is stored as if announced here and never announced again; one that's missing or by another account is a problem for that post only.
- Each post is announced once. Replacing an announcement (`--reannounce <post>`, offering to delete the old one) is planned for a later version; until then it's done by hand.

### Commands

- `npx atmosphere-publishing preview`: shows exactly what would change, including each announcement's wording and date. Changes nothing.
- `npx atmosphere-publishing publish`: does it.
- `npx atmosphere-publishing sync`: rebuilds the state file from your account (for a fresh clone, or a lost file). Matches records to posts by address, as Sequoia does.

### On the site

- `<AtmosphereHead entry={post} />`, placed in the post layout's `<head>`, adds the `<link rel="site.standard.document">` tag. (A component rather than rewriting built HTML, so it works for server-rendered pages too.)
- The integration serves `/.well-known/site.standard.publication`.
- `getAnnouncement(entry)` returns the post's Bluesky post, for sites that want a "Reply on Bluesky" link without Atmosphere Comments.

### State

A JSON file, committed to the repository (`src/data/atmosphere-publishing.json`), holding each record's address, version and hash, and each announcement. The site reads it at build time for the `<link>` tags. `sync` can rebuild it.

### Deploying

- An app password in `ATPROTO_HANDLE` and `ATPROTO_APP_PASSWORD` (environment or `.env`), checked against the publication's account before anything is written.
- The README gives a ready-made GitHub Actions step: run `publish` before the build, then commit the state file back, retrying if the branch moved (as saltedlolly.com's deploy does). If the secrets are missing, it skips publishing without failing the deploy.

## Configuration (sketch)

The settings live in `atmosphere-publishing.config.mjs` at the project's root, read by both the command and the Astro integration (which adds `atmospherePublishing()` to `astro.config.mjs` with no options). Each collection names its files and, optionally, the functions that turn a post into its address, description, tags and cover image.

```js
import atmospherePublishing from "astro-atmosphere-publishing";

atmospherePublishing({
  publication: {
    name: "saltedlolly",
    description: "My corner of the open web",
    icon: "public/brand/avatar-512.png",
  },
  collections: {
    blog: {
      // The page address for an entry (the same rule the site's pages use).
      path: (entry) => `/${entry.id}/`,
      // Optional: plain text for search, and the cover image.
      textContent: (entry) => entry.body,
      cover: (entry) => entry.data.heroImage,
    },
  },
  announceWithinDays: 14,
});
```

Frontmatter it reads, all optional, with field names configurable: `title`, `description`, `pubDate`, `updatedDate`, `tags`, `draft`, `announce`.

## More than Standard.site

Standard.site comes first, and is named near the top of the README and the npm description. Internally, each format is a "publisher" module that turns entries into records (`publishers/standard-site.ts`), so another can be added later without changing the commands, state file or announcements. Possible candidates, none planned: other long-form formats that may appear, or photo posts for galleries. The announcement and `<link>` tag parts stay shared.

## What it won't do

- No comments, subscribe or recommend buttons: those are Atmosphere Comments.
- No content rendering in the records (`publishContent` in Sequoia's terms) in version 1: `textContent` is plain text for search. Full content could come later.
- Never deletes records or posts without being asked.

## Plan

1. Agree this design (open questions below).
2. Build the package from saltedlolly.com's script, generalised; test it on a fresh Astro site and then on saltedlolly.com, replacing `scripts/atproto-publish.mts` with no change to existing records (the state file is converted, nothing is republished).
3. Atmosphere Comments: document using it with Atmosphere Publishing (`publicationFromState()`) and with Sequoia in its README.
4. Publish both, with a post on saltedlolly.com, as for Atmosphere Comments.

## Open questions for Olly

1. **Name and npm package:** "Atmosphere Publishing for Astro", `astro-atmosphere-publishing` (both free on npm today). The README's first line names Standard.site. **Agreed (Olly, 7 November 2026).**
2. **Head component or automatic tags?** **Decided (Olly, 7 November 2026): the component** (`<AtmosphereHead entry={post} />`). It always knows which post the page shows and works for prerendered and server-rendered pages. An optional automatic mode (middleware that looks the page's address up in the state file) may come in a later version.
3. **State file location and format:** **Decided (Olly, 7 November 2026): `src/data/atmosphere-publishing.json`** for every site, saltedlolly.com included (its `src/data/atproto.json` is renamed once when it switches over, and its deploy step updated). The same layout as that file plus a version number, so switching republishes nothing. Only Atmosphere Publishing reads and writes it (and the site, through the package's helpers); Atmosphere Comments never reads it. **Safeguard:** if the file is missing or empty, `publish` first rebuilds it from the account (as `sync`), so a lost, renamed or freshly cloned file can never cause duplicate records or announcements.
4. **Licence:** MIT, as Atmosphere Comments. **Agreed (Olly, 7 November 2026).** No "Powered by" credit: nothing new appears on the page for readers to see. The README asks, politely, for a link to the blog post about Atmosphere Publishing for Astro on saltedlolly.com (once published), so other developers find it (as Atmosphere Comments' "Saying thanks").
5. **Should Atmosphere Comments read the publication automatically?** **Decided (Olly, 7 November 2026): no, keep `standardSite` explicit**, with a helper from this package so the address is never copied by hand: `standardSite: { publication: publicationFromState() }`. Installing a publishing tool should never quietly add a button and a reader permission.
