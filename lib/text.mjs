// Plain text from Markdown, for a document's description and searchable text.
// The same rules saltedlolly.com's feeds and records have always used.

export const MORE_MARKER = /<!--\s*more\s*-->/i;

/** Markdown to plain-text paragraphs: images dropped, links reduced to their text, marks removed. */
export function plainParagraphs(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n{2,}/)
    // A paragraph that is only a link isn't part of what the post says.
    .filter((paragraph) => !/^\s*\[[^\]]+\]\([^)]+\)\s*$/.test(paragraph))
    .map((paragraph) =>
      paragraph
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        // A link that only wrapped an image is now empty: drop it too.
        .replace(/\[\s*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/(\*\*|__|\*|_|`)(.+?)\1/g, "$2")
        .replace(/<[^>]+>/g, "")
        .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.)\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

/** Everything above `<!--more-->`, or the whole post when there is no marker. */
export function previewMarkdown(markdown) {
  return MORE_MARKER.test(markdown) ? markdown.split(MORE_MARKER)[0] : markdown;
}

/**
 * The searchable text for a post's record, by the `share` setting:
 *   "more"   everything above <!--more-->, or the whole post when there's no marker (default)
 *   "intro"  everything above <!--more-->, or the first paragraph when there's no marker
 *   "full"   the whole post
 *   "none"   nothing (the record still has the title and description)
 * Always plain text: no formatting, images or link addresses.
 */
export function sharedText(markdown, share = "more") {
  if (share === "none") return "";
  if (share === "full") return plainParagraphs(markdown.replace(MORE_MARKER, "")).join("\n\n");
  if (share === "intro" && !MORE_MARKER.test(markdown)) {
    const [first = ""] = plainParagraphs(
      markdown.split(/\n{2,}/).filter((paragraph) => !paragraph.trim().startsWith("#")).join("\n\n"),
    );
    return first;
  }
  return plainParagraphs(previewMarkdown(markdown)).join("\n\n");
}

export const SHARE_OPTIONS = ["more", "intro", "full", "none"];

/** The first paragraph with text (headings skipped), cut to 160 characters. */
export function firstParagraph(markdown) {
  const text = plainParagraphs(
    previewMarkdown(markdown)
      .split(/\n{2,}/)
      .filter((paragraph) => !paragraph.trim().startsWith("#"))
      .join("\n\n"),
  )[0] ?? "";
  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, "")}…` : text;
}
