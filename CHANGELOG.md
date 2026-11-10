# Changelog

## 0.3.0 (10 November 2026)

- **Announcements show "View Publication" on Bluesky.** The announcement's link card now names the post's Standard.site document and your publication (`associatedRefs` on `app.bsky.embed.external`, as strong refs), which Bluesky uses to show "View Publication" on the card. To make that possible, a new announcement is now published in three steps: the document record (without `bskyPostRef`), then the announcement, then the document again with `bskyPostRef`. If publishing stops part-way, the next run finds the document and updates it; nothing is duplicated.
- The preview says "with View Publication" on each announcement's card.
- A state file whose publication has no `cid` gets it from the account when needed.
- Announcements made before can't change (Bluesky posts can't be edited), so they keep their plain card. Nothing else changes for existing sites: no records are rewritten.

## 0.2.0 (8 November 2026)

- **Posts you've already announced keep their announcement.** `announcement:` in a post's frontmatter (an AT URI or a bsky.app address) names a Bluesky post that already announces it, made by hand, by a release bot or by another tool. The post is never announced again: its record points to that post (`bskyPostRef`), so comments, likes and reposts carry on in the same thread. A collection's `announcement` function maps a field of your own instead (`(post) => post.data.bskyPost`).
- The preview lists these as "linked to existing announcement". A post that's by another account, deleted or mistyped is reported as a problem for that post only, and everything else carries on. `announce:` and `announcement:` on the same post is an error.
- Naming a different post later moves the record to it, and nothing is deleted on Bluesky. The preview notes posts that share one announcement.
- Nothing changes for existing sites: no state file change, and no records are rewritten.

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
