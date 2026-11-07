// The posts to publish, read from the Markdown files each collection names.
// (The command runs outside Astro, which only lets code read collections while
// the site is running or building, so it reads the files directly.)
import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { firstParagraph, plainParagraphs, previewMarkdown } from "./text.mjs";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** A post's id: its folder for index files (as Astro's glob loader does), otherwise its file name. */
const defaultId = (file) => {
  const name = path.basename(file).replace(/\.(md|mdx|markdown)$/, "");
  return name === "index" ? path.basename(path.dirname(file)) : name;
};

const dateOf = (value) => (value ? new Date(value) : undefined);

/**
 * Reads every published (not draft) post of every collection, oldest first.
 * @param {import("../index").ResolvedConfig} config
 */
export async function readEntries(config) {
  const posts = [];
  const seen = new Map();
  for (const collection of config.collections) {
    for await (const relative of glob(collection.files, { cwd: config.root })) {
      const file = path.join(config.root, relative);
      const source = await readFile(file, "utf8");
      const match = source.match(FRONTMATTER);
      if (!match) continue;
      const data = parseYaml(match[1]) ?? {};
      const body = match[2];
      const entry = { id: (collection.id ?? ((e) => defaultId(e.file)))({ file, data, body }), file, folder: path.dirname(file), data, body };
      if ((collection.draft ?? ((e) => Boolean(e.data.draft)))(entry)) continue;
      if (seen.has(entry.id)) throw new Error(`Two posts have the id "${entry.id}": ${seen.get(entry.id)} and ${relative}. Ids must be unique.`);
      seen.set(entry.id, relative);

      const publishedAt = dateOf((collection.publishedAt ?? ((e) => e.data.pubDate ?? e.data.publishDate ?? e.data.date))(entry));
      if (!publishedAt || Number.isNaN(publishedAt.valueOf())) throw new Error(`${relative}: no publication date (pubDate, publishDate or date).`);
      const postPath = collection.path({ ...entry, publishedAt });
      const cover = (collection.cover ?? ((e) => e.data.heroImage ?? e.data.cover ?? e.data.image))(entry);
      // The field order matters: it is part of each record's fingerprint.
      posts.push({
        id: entry.id,
        url: new URL(postPath, `${config.site}/`).href,
        path: postPath,
        title: (collection.title ?? ((e) => e.data.title))(entry),
        description: (collection.description ?? ((e) => e.data.description || firstParagraph(e.body)))(entry),
        textContent: (collection.textContent ?? ((e) => plainParagraphs(previewMarkdown(e.body)).join("\n\n")))(entry),
        tags: (collection.tags ?? ((e) => e.data.tags ?? []))(entry),
        publishedAt,
        updatedAt: dateOf((collection.updatedAt ?? ((e) => e.data.updatedDate ?? e.data.updatedAt))(entry)),
        // Not part of the record.
        coverFile: typeof cover === "string" ? path.resolve(entry.folder, cover) : null,
        archived: Boolean(collection.archived?.(entry)),
        announce: entry.data.announce,
        source: relative,
      });
    }
  }
  return posts.sort((first, second) => first.publishedAt.valueOf() - second.publishedAt.valueOf());
}
