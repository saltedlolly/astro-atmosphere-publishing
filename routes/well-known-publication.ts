// /.well-known/site.standard.publication: the publication's AT URI, as plain
// text. Reader apps fetch it to confirm the site owns the publication.
import type { APIRoute } from "astro";
import { getPublication } from "../lib/records";

export const GET: APIRoute = () => {
  const publication = getPublication();
  return publication
    ? new Response(publication.uri, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    : new Response("Not published yet.", { status: 404 });
};
