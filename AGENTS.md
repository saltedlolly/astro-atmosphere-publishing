# Working on Atmosphere Publishing for Astro

Notes for anyone changing this package, people and coding agents alike. What it does and how to use it is in [README.md](README.md); the design and the decisions behind it are in [DESIGN.md](DESIGN.md).

Maintained by [Olly Stedall](https://saltedlolly.com) and used on [saltedlolly.com](https://saltedlolly.com); changes are released only after they've been tried there.

## Layout

| Path | What it is |
| --- | --- |
| `bin/cli.mjs` | The `atmosphere-publishing` command: `preview`, `publish`, `sync`. |
| `lib/config.mjs` | Loads and checks `atmosphere-publishing.config.mjs` (shared by the command and the integration). |
| `lib/entries.mjs` | Reads the posts from the Markdown files each collection names. |
| `lib/publish.mjs` | The plan (what would change), its description, and publishing. |
| `lib/existing.mjs` | Posts linked to an announcement made before (`announcement:`): checking it exists and is the account's own. |
| `lib/sync.mjs` | Rebuilds the state file from the account's public records. |
| `lib/state.mjs` | The state file: its layout, converting older layouts, reading and saving. |
| `lib/publishers/standard-site.mjs` | Standard.site records and fingerprints. Another format would be a file beside it. |
| `lib/account.mjs` | Signing in with an app password at the account's own host. |
| `index.mjs` | The Astro integration: the `.well-known` route and the state as a virtual module. |
| `components/AtmosphereHead.astro`, `lib/records.ts` | For pages: the `<link>` tag, and a post's records and announcement. |
| `helpers.mjs` | `defineConfig` and `publicationFromState()`, for plain Node. |

## Ground rules

- **Never delete or duplicate.** Publishing creates and updates records only. A missing or empty state file is rebuilt from the account before anything is written. Replacing an announcement is always a deliberate step.
- **Refuse the wrong account.** Every publish checks the signed-in DID against `account` before writing.
- **Fingerprints are compatible.** The fields and their order in `documentHash` match saltedlolly.com's earlier script, so switching over republished nothing. Changing them makes every site update every record once: say so in the changelog.
- **The state file has a version.** A change to its layout bumps `STATE_VERSION` and converts older files in `parseState`.
- **Atmosphere Comments for Astro never reads the state file.** The two meet only through Standard.site: the `<link>` tag, `bskyPostRef` and the publication's AT URI.

## Trying a change

- `npm pack`, install the file into a fresh Astro site, then run `preview`, `astro build` and `astro dev`.
- On saltedlolly.com: `npx atmosphere-publishing preview` should say everything is up to date unless posts changed.
