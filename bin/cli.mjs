#!/usr/bin/env node
// atmosphere-publishing preview | publish | sync
//
//   preview  shows what would change, including each announcement's wording. Changes nothing.
//   publish  publishes it (needs ATPROTO_HANDLE and ATPROTO_APP_PASSWORD).
//   sync     rebuilds src/data/atmosphere-publishing.json from the account.
//
// Settings: atmosphere-publishing.config.mjs in the current folder. A .env file
// there is read too, if present.
import { existsSync } from "node:fs";
import { loadConfig } from "../lib/config.mjs";
import { describe, plan, publish } from "../lib/publish.mjs";
import { reader } from "../lib/account.mjs";
import { saveState } from "../lib/state.mjs";
import { syncState } from "../lib/sync.mjs";

const USAGE = "Usage: atmosphere-publishing <preview | publish | sync>";

async function main() {
  const command = process.argv[2] ?? "preview";
  if (existsSync(".env")) process.loadEnvFile(".env");
  const config = await loadConfig();
  if (command === "preview") {
    const lines = describe(await plan(config), config);
    if (!lines.some((line) => !line.startsWith("note:"))) {
      for (const line of lines) console.log(`  • ${line}`);
      console.log("Everything is already published and up to date.");
      return;
    }
    console.log("Preview — nothing has been published:");
    for (const line of lines) console.log(`  • ${line}`);
    console.log("\nRun  npx atmosphere-publishing publish  to do this.");
  } else if (command === "publish") {
    await publish(config);
  } else if (command === "sync") {
    // Public records only, so no sign-in is needed.
    await saveState(config.stateFile, await syncState(config, await reader(config.account)));
    console.log(`Saved ${config.stateFile}.`);
  } else {
    console.log(USAGE);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
