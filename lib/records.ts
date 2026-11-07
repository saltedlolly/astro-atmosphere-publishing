// For the site's pages: a post's records and Bluesky announcement, from the
// state file as it was when the site was built.
/// <reference path="../virtual.d.ts" />
import state from "virtual:atmosphere-publishing/state";

type Ref = { uri: string; cid: string };
export type Announcement = Ref & { url: string };

/** The post's id: an Astro collection entry, or the id itself. */
const idOf = (entry: string | { id: string }) => (typeof entry === "string" ? entry : entry.id);

/** The post's Standard.site document record, if it has been published. */
export function getRecord(entry: string | { id: string }): Ref | undefined {
  return state.formats["standard.site"]?.documents[idOf(entry)];
}

/** The post's Bluesky announcement (its comment thread), if it has one. */
export function getAnnouncement(entry: string | { id: string }): Announcement | undefined {
  return state.announcements[idOf(entry)];
}

/** The site's Standard.site publication, if it has been published. */
export function getPublication(): Ref | undefined {
  return state.formats["standard.site"]?.publication ?? undefined;
}
