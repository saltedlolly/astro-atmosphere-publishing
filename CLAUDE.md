Instructions for coding agents working on this package are in [AGENTS.md](AGENTS.md). Read it before making changes. The design and Olly's decisions are in [DESIGN.md](DESIGN.md).

## Ideas for later versions

- **Optional automatic `<link>` tags** (Olly, 7 November 2026): version 1 uses the `<AtmosphereHead entry={post} />` component in the layout. A later version could add an opt-in mode (Astro middleware that looks each page's address up in the state file and inserts the tag), for sites that would rather not touch their layout.
- **Collections from other loaders** (a CMS, say), not only Markdown files.
- **Announcing an older post dated now** (Olly, 20 November 2026): older posts' announcements are always dated to the post. A per-post option (e.g. `announceDated: now`) would let a back-dated post reach followers' timelines. saltedlolly.com did it once for Nixel Clock by raising `announceWithinDays` for one deploy.
- **Replacing an announcement** (`--reannounce <post>`, offering to delete the old one), as done by hand for saltedlolly.com on 7 November 2026.
