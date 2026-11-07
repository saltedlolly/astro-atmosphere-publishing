# Changelog

## 0.1.1 (7 November 2026)

- **@mentions, #hashtags and links in announcements work**, as in the Bluesky app: they become links, and mentioned accounts are notified. The preview lists what each announcement will link.
- **`share` setting:** how much of each post goes into its record's searchable text: `"more"` (default, as before: everything above `<!--more-->`, or the whole post without a marker), `"intro"` (the first paragraph when there's no marker), `"full"` or `"none"`. Set it for the site, a collection, or a post (`share:` in its frontmatter). Nothing changes for existing sites.

## 0.1.0 (7 November 2026)

First release, built from saltedlolly.com's own publishing script.

- Standard.site publication and document records from Markdown posts, updated only when a post changes.
- Bluesky announcements for new posts, with each post's own `announce:` wording above the link card (or the card alone); older posts announced only when they ask, dated to the post.
- `<AtmosphereHead entry={post} />` for each page's `<link rel="site.standard.document">` tag, `/.well-known/site.standard.publication`, `getRecord`, `getAnnouncement` and `getPublication` for pages, and `publicationFromState()` for Atmosphere Comments for Astro.
- `preview`, `publish` and `sync` commands. A missing state file is rebuilt from the account before publishing, so it never causes duplicates.
- State file `src/data/atmosphere-publishing.json`, with a section per format. saltedlolly.com's earlier `atproto.json` layout is converted automatically.
