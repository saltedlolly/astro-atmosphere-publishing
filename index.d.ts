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
  /** Plain text for search. Default: the text above <!--more-->, or the whole post. */
  textContent?: (post: Entry) => string;
  tags?: (post: Entry) => string[];
  /** Default: pubDate, publishDate or date. */
  publishedAt?: (post: Entry) => string | Date;
  /** Default: updatedDate or updatedAt. */
  updatedAt?: (post: Entry) => string | Date | undefined;
  /** The cover image file, relative to the post's folder. Default: heroImage, cover or image. */
  cover?: (post: Entry) => string | undefined;
  /** Default: the frontmatter's draft. Drafts are never published. */
  draft?: (post: Entry) => boolean;
  /** Posts that are never "new" (imported from an old site, say), so they're only announced when they ask. */
  archived?: (post: Entry) => boolean;
};

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
