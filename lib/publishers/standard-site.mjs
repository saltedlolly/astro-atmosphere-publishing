// Standard.site (https://standard.site): one site.standard.publication record
// for the site, and one site.standard.document record per post. Other formats
// can be added beside this file later; the command, state and announcements
// are shared.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

export const PUBLICATION = "site.standard.publication";
export const DOCUMENT = "site.standard.document";
const MAX_BLOB_BYTES = 1_000_000;

export const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const publicationFields = (config) => ({
  url: config.site,
  name: config.publication.name,
  description: config.publication.description,
});

/** The publication's fingerprint: its fields and icon. */
export async function publicationHash(config) {
  const icon = config.publication.icon ? sha256(await readFile(`${config.root}/${config.publication.icon}`)) : "";
  return sha256(JSON.stringify(publicationFields(config)) + icon);
}

export async function publicationRecord(config, upload) {
  const icon = config.publication.icon
    ? await upload(await sharp(`${config.root}/${config.publication.icon}`).png().toBuffer(), "image/png")
    : undefined;
  return { $type: PUBLICATION, ...publicationFields(config), ...(icon && { icon }) };
}

/** The fields a document's fingerprint covers (in this order, as earlier fingerprints were made). */
const recordFields = ({ id, url, path, title, description, textContent, tags, publishedAt, updatedAt }) => ({
  id, url, path, title, description, textContent, tags, publishedAt, updatedAt,
});

/** A post's fingerprint: what its record says, so unchanged posts are skipped. */
export async function documentHash(post, publicationUri, announcement) {
  const hero = post.coverFile ? sha256(await readFile(post.coverFile)) : null;
  return sha256(JSON.stringify({ fields: recordFields(post), hero, publicationUri, announcement: announcement?.uri ?? null }));
}

/** Cover images must be under 1 MB: 1200px wide, with the JPEG quality lowered until it fits. */
export async function coverImage(file) {
  for (const quality of [85, 75, 65, 55]) {
    const image = await sharp(file).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality }).toBuffer();
    if (image.length < MAX_BLOB_BYTES) return image;
  }
  throw new Error(`${file}: the cover image is still over 1 MB.`);
}

export function documentRecord(post, publicationUri, cover, announcement) {
  return {
    $type: DOCUMENT,
    site: publicationUri,
    path: post.path,
    title: post.title,
    description: post.description,
    ...(post.textContent && { textContent: post.textContent }),
    tags: post.tags,
    publishedAt: post.publishedAt.toISOString(),
    ...(post.updatedAt && { updatedAt: post.updatedAt.toISOString() }),
    ...(cover && { coverImage: cover }),
    ...(announcement && { bskyPostRef: { uri: announcement.uri, cid: announcement.cid } }),
  };
}
