# Changelog

## 0.1.0 (unreleased)

First release, built from saltedlolly.com's own publishing script.

- Standard.site publication and document records from Markdown posts, updated only when a post changes.
- Bluesky announcements for new posts, with each post's own `announce:` wording above the link card (or the card alone); older posts announced only when they ask, dated to the post.
- `<AtmosphereHead entry={post} />` for each page's `<link rel="site.standard.document">` tag, `/.well-known/site.standard.publication`, `getRecord`, `getAnnouncement` and `getPublication` for pages, and `publicationFromState()` for Atmosphere Comments for Astro.
- `preview`, `publish` and `sync` commands. A missing state file is rebuilt from the account before publishing, so it never causes duplicates.
- State file `src/data/atmosphere-publishing.json`, with a section per format. saltedlolly.com's earlier `atproto.json` layout is converted automatically.
