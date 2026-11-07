# Atmosphere Publishing for Astro

**Publish your Astro site to the Atmosphere with [Standard.site](https://standard.site).** Every post gets a Standard.site record in your own AT Protocol account, new posts are announced on Bluesky, and each page is linked to its record. Apps such as [Leaflet](https://leaflet.pub), [Standard Reader](https://standard-reader.app) and Bluesky can then find your writing, show it and let people subscribe.

It pairs with **[Atmosphere Comments for Astro](https://github.com/saltedlolly/astro-atmosphere-comments)**: with both installed, every announced post gets a comment section with no further setup, and readers can subscribe and recommend right on your page. Each works without the other.

Made by [Olly Stedall](https://saltedlolly.com) and used on [saltedlolly.com](https://saltedlolly.com).

## How it works

1. **You run `npx atmosphere-publishing publish` before building** (by hand or in your deploy). It reads your Markdown posts and, in your account:
   - creates or updates one `site.standard.publication` record for your site;
   - creates or updates a `site.standard.document` record for each post (title, address, description, searchable text, tags, dates and cover image), only when the post has changed;
   - announces new posts on Bluesky with a link card. That post becomes the post's comment thread, and the record points to it (`bskyPostRef`).
2. **It saves what it published** in `src/data/atmosphere-publishing.json`, which you commit.
3. **When the site is built**, the integration reads that file: `<AtmosphereHead>` adds each page's `<link rel="site.standard.document">` tag, and the site serves `/.well-known/site.standard.publication`, which apps use to confirm the site is yours.

Publishing never deletes anything. A post you remove is reported, and its record is left for you to delete if you want to.

## Install

```sh
npm install astro-atmosphere-publishing
```

You'll need an Astro site with Markdown posts, and an [app password](https://bsky.app/settings/app-passwords) for the account that publishes (Bluesky's, or any other Atmosphere account).

### 1. The settings file

Create `atmosphere-publishing.config.mjs` in your project's root. The command and the integration both read it:

```js
import { defineConfig } from "astro-atmosphere-publishing/helpers";

export default defineConfig({
  site: "https://example.com",
  // The DID of the account that publishes. Signing in as any other account is refused.
  account: "did:plc:your-did-here",
  publication: {
    name: "My blog",
    description: "What it's about",
    icon: "public/icon.png", // a square image
  },
  collections: [
    {
      files: "src/content/blog/**/*.md",
      // Each post's address: the same rule your pages use.
      path: (post) => `/blog/${post.id}/`,
    },
  ],
});
```

To find your DID: `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=you.bsky.social`.

A post's `id` is its folder for `index.md` files and its file name otherwise, as Astro's `glob()` loader names them. Everything else is read from the frontmatter: `title`, `description` (or the first paragraph), `pubDate` (or `publishDate`, `date`), `updatedDate`, `tags`, `heroImage` (or `cover`, `image`) and `draft`. Each has a function to override it if your posts use other fields (see "Settings").

### 2. The integration

```js
// astro.config.mjs
import atmospherePublishing from "astro-atmosphere-publishing";

export default defineConfig({
  site: "https://example.com",
  integrations: [atmospherePublishing()],
});
```

### 3. The tag in your post layout

```astro
---
import AtmosphereHead from "astro-atmosphere-publishing/AtmosphereHead.astro";
const { post } = Astro.props; // a content collection entry
---

<head>
  …
  <AtmosphereHead entry={post} />
</head>
```

For a "Reply on Bluesky" link of your own, `getAnnouncement(post)` from `astro-atmosphere-publishing/records` gives the announcement's `url`.

### 4. Publish

```sh
npx atmosphere-publishing preview   # what would change, including each announcement's wording
npx atmosphere-publishing publish   # do it
```

`publish` needs `ATPROTO_HANDLE` and `ATPROTO_APP_PASSWORD`, from the environment or a `.env` file. Then commit `src/data/atmosphere-publishing.json`, build and deploy.

## Announcements

- **New posts** (published within `announceWithinDays`, default 14) are announced, dated now.
- The announcement's text is the post's own wording, `announce: "…"` in its frontmatter, shown above the link card. **Write it for every post:** the card already shows the title and description, so say something new. Without it, the announcement is the link card alone.
- **Older posts** are announced only when they ask (`announce: "…"`, or `announce: true` for the card alone). Their announcement is dated to the post itself, so Bluesky files it in the past and it doesn't reach followers' timelines, but it still gives the post a comment thread.
- `announce: false` never announces a post.
- Each post is announced once.

## With Atmosphere Comments for Astro

Comments find each post's announcement through its `<link>` tag, so the comment box needs no `post` prop. For the Subscribe button, hand the publication over in one line:

```js
import atmosphereComments from "astro-atmosphere-comments";
import { publicationFromState } from "astro-atmosphere-publishing/helpers";

atmosphereComments({
  clientName: "example.com",
  allowedAuthors: ["did:plc:your-did-here"],
  standardSite: { publication: publicationFromState(), feed: "/feed/" },
});
```

## Publishing from your deploy

Add the app password as secrets (`ATPROTO_HANDLE`, `ATPROTO_APP_PASSWORD`), then publish before the build and commit the state file back. For GitHub Actions:

```yaml
permissions:
  contents: write

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with: { node-version: 24 }
  - run: npm ci
  - name: Publish to the Atmosphere
    env:
      ATPROTO_HANDLE: ${{ secrets.ATPROTO_HANDLE }}
      ATPROTO_APP_PASSWORD: ${{ secrets.ATPROTO_APP_PASSWORD }}
    run: |
      if [ -z "$ATPROTO_APP_PASSWORD" ]; then echo "No app password, so nothing is published."; exit 0; fi
      npx atmosphere-publishing publish
      if ! git diff --quiet -- src/data/atmosphere-publishing.json; then
        git config user.name "github-actions[bot]"
        git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
        git add src/data/atmosphere-publishing.json
        git commit -m "Atmosphere Publishing: update state"
        for attempt in 1 2 3; do git pull --rebase && git push && break; sleep 5; done
      fi
  - run: npm run build
```

Commit the state file even when publishing fails part-way: it's saved after every record, so the next run picks up where it stopped.

## The state file

`src/data/atmosphere-publishing.json` records, for each post, its record's address and version, a fingerprint (so unchanged posts are skipped) and its announcement. Each publishing format has its own section, so formats added later never disturb the others.

**If it's lost** (a fresh clone, say), `publish` rebuilds it from your account first, matching records to posts by address, so it never creates duplicates or announces twice. `npx atmosphere-publishing sync` does just the rebuild. After a rebuild the next `publish` rewrites each record once, in place, because fingerprints aren't stored in your account.

## Settings

| Setting | | What it does |
| --- | --- | --- |
| `site` | required | Your site's address. |
| `account` | required | The publishing account's DID. |
| `publication.name`, `.description`, `.icon` | name required | The publication record. |
| `collections` | required | One or more: `files` (a glob) and `path` (a function), plus optional overrides: `id`, `title`, `description`, `textContent`, `tags`, `publishedAt`, `updatedAt`, `cover`, `draft` and `archived` (posts never treated as new, such as ones imported from an old site). Each takes the post (`id`, `file`, `folder`, `data` for the frontmatter, `body`). |
| `announceWithinDays` | default 14 | How recent a post must be to count as new. |
| `langs` | default `["en"]` | The announcements' languages. |

## Requirements and limits

- Node 22.13 or later, Astro 5 or later.
- Markdown (`.md`, `.mdx`) posts. Collections from other loaders (a CMS, say) aren't supported yet.
- Records carry plain text for search, not the full formatted post.

## Saying thanks

It's free and open source (MIT). If it's useful, a link to [the post about it on saltedlolly.com](https://saltedlolly.com) helps other developers find it. You can also support the work through [GitHub Sponsors](https://github.com/sponsors/saltedlolly) or [Ko-fi](https://ko-fi.com/saltedlolly).

## License

MIT
