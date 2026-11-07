import type { AtmospherePublishingConfig } from "./index";

/** For atmosphere-publishing.config.mjs: checks nothing at runtime, but gives your editor the types. */
export function defineConfig(config: AtmospherePublishingConfig): AtmospherePublishingConfig;

/** The site's Standard.site publication AT URI from the state file, or undefined before the first publish. */
export function publicationFromState(root?: string): string | undefined;
