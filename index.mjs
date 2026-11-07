// Atmosphere Publishing for Astro: the Astro integration. Publishing itself is
// done by the command (bin/cli.mjs), before the site is built; this part puts
// the results on the site:
//
//   /.well-known/site.standard.publication   the publication's AT URI, which
//       reader apps use to confirm the site owns it
//   <AtmosphereHead entry={post} />          each page's
//       <link rel="site.standard.document"> tag (components/AtmosphereHead.astro)
//   virtual:atmosphere-publishing/state      the state file, for the component
//       and lib/records.ts (getRecord, getAnnouncement)
//
// Settings: atmosphere-publishing.config.mjs at the project's root, shared with
// the command.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./lib/config.mjs";
import { emptyState, parseState } from "./lib/state.mjs";

const STATE_ID = "virtual:atmosphere-publishing/state";

/** @returns {import("astro").AstroIntegration} */
export default function atmospherePublishing() {
  return {
    name: "atmosphere-publishing",
    hooks: {
      "astro:config:setup": async ({ config, injectRoute, updateConfig, addWatchFile }) => {
        const settings = await loadConfig(fileURLToPath(config.root));
        addWatchFile(settings.stateFile);
        const readSafely = () => (existsSync(settings.stateFile) ? parseState(JSON.parse(readFileSync(settings.stateFile, "utf8"))) : emptyState());
        injectRoute({
          pattern: "/.well-known/site.standard.publication",
          entrypoint: fileURLToPath(new URL("./routes/well-known-publication.ts", import.meta.url)),
          prerender: true,
        });
        updateConfig({
          vite: {
            plugins: [
              {
                name: "atmosphere-publishing-state",
                resolveId: (id) => (id === STATE_ID ? `\0${id}` : undefined),
                // Read when the site is built, so it's the state the last `publish` left.
                load: (id) => (id === `\0${STATE_ID}` ? `export default ${JSON.stringify(readSafely())};` : undefined),
              },
            ],
          },
        });
      },
    },
  };
}
