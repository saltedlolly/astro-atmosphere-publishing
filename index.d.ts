import type { AstroIntegration } from "astro";

/** One post, as the settings file's functions see it. */
export type Entry = {
  /** The post's id: its folder for index.md files (as Astro's glob loader), otherwise its file name. */
  id: string;
  /** The Markdown file's full path, and its folder. */
  file: string;
  folder: string;
  /** The frontmatter. */
  data: Record<string, any>;
  /** The Markdown after the frontmatter. */
  body: string;
};

export type CollectionSettings = {
  /** The Markdown files, as a glob from the project's root, e.g. "src/content/blog/**\/*.md". */
  files: string;
  /** The post's address on the site, e.g. (post) => `/blog/${post.id}/`. The same rule your pages use. */
  path: (post: Entry & { publishedAt: Date }) => string;
  /** Overrides for anything read from the frontmatter by default. */
  id?: (post: Pick<Entry, "file" | "data" | "body">) => string;
  title?: (post: Entry) => string;
  /** Default: the frontmatter's description, or the first paragraph. */
  description?: (post: Entry) => string;
  /** Plain text for search, replacing `share`'s choice. */
  textContent?: (post: Entry) => string;
  tags?: (post: Entry) => string[];
  /** Default: pubDate, publishDate or date. */
  publishedAt?: (post: Entry) => string | Date;
  /** Default: updatedDate or updatedAt. */
  updatedAt?: (post: Entry) => string | Date | undefined;
  /** The cover image file, relative to the post's folder. Default: heroImage, cover or image. */
  cover?: (post: Entry) => string | undefined;
  /** How much text this collection's records share (see AtmospherePublishingConfig.share). A post's own `share:` overrides it. */
  share?: Share;
  /** Default: the frontmatter's draft. Drafts are never published. */
  draft?: (post: Entry) => boolean;
  /** Posts that are never "new" (imported from an old site, say), so they're only announced when they ask. */
  archived?: (post: Entry) => boolean;
  /**
   * A Bluesky post that already announces this post (an AT URI or a bsky.app
   * address), made by hand or another tool. The post is linked to it and never
   * announced again. Default: the frontmatter's `announcement`.
   */
  announcement?: (post: Entry) => string | undefined;
};

export type Share = "more" | "intro" | "full" | "none";

export type AtmospherePublishingConfig = {
  /** Your site's address, e.g. "https://example.com". */
  site: string;
  /** The DID of the account that publishes (did:plc:… or did:web:…). Signing in as any other account is refused. */
  account: string;
  publication: {
    name: string;
    description?: string;
    /** A square image, relative to the project's root, e.g. "public/icon.png". */
    icon?: string;
  };
  collections: CollectionSettings[];
  /**
   * How much of each post goes into its record's searchable text (always plain text):
   * "more" (default) everything above <!--more-->, or the whole post when there's no marker;
   * "intro" everything above <!--more-->, or the first paragraph when there's no marker;
   * "full" the whole post; "none" nothing (the record keeps its title and description).
   * A collection's `share`, or a post's own `share:` in its frontmatter, overrides it.
   */
  share?: Share;
  /** Posts published within this many days are announced as new. Default 14. */
  announceWithinDays?: number;
  /** The announcements' languages. Default ["en"]. */
  langs?: string[];
};

export type ResolvedConfig = Required<Omit<AtmospherePublishingConfig, "publication">> & {
  publication: AtmospherePublishingConfig["publication"] & { description: string };
  root: string;
  stateFile: string;
};

type Ref = { uri: string; cid: string };
export type State = {
  version: 1;
  announcements: Record<string, Ref & { url: string }>;
  formats: {
    "standard.site": { publication: (Ref & { hash: string }) | null; documents: Record<string, Ref & { hash: string }> };
    [format: string]: unknown;
  };
};

/** The Astro integration: adds /.well-known/site.standard.publication and makes the state available to <AtmosphereHead>. */
export default function atmospherePublishing(): AstroIntegration;
