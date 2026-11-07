// Signing in to the publishing account with an app password, at the account's
// own host (found from its DID, so accounts outside Bluesky work too).
import { AtpAgent } from "@atproto/api";

/** The account's host (PDS), from its DID document. */
export async function hostOf(did) {
  const url = did.startsWith("did:web:")
    ? `https://${decodeURIComponent(did.slice("did:web:".length))}/.well-known/did.json`
    : `https://plc.directory/${did}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Couldn't look up ${did} (${response.status}).`);
  const doc = await response.json();
  const service = doc.service?.find((entry) => entry.id === "#atproto_pds" || entry.type === "AtprotoPersonalDataServer");
  if (!service?.serviceEndpoint) throw new Error(`${did} has no account host in its DID document.`);
  return service.serviceEndpoint;
}

/**
 * Signs in with ATPROTO_HANDLE and ATPROTO_APP_PASSWORD, and refuses to go on
 * unless it's the account the settings name.
 */
export async function signIn(account) {
  const identifier = process.env.ATPROTO_HANDLE;
  const password = process.env.ATPROTO_APP_PASSWORD;
  if (!identifier || !password) {
    throw new Error("Set ATPROTO_HANDLE and ATPROTO_APP_PASSWORD (an app password from your account's settings) first.");
  }
  const agent = new AtpAgent({ service: await hostOf(account) });
  await agent.login({ identifier, password });
  if (agent.session?.did !== account) {
    throw new Error(`Signed in as ${agent.session?.did}, not ${account} from the settings. Nothing was published.`);
  }
  return agent;
}

/** Bluesky's public service, for looking up handles without signing in (the preview's @mentions). */
export const publicAgent = () => new AtpAgent({ service: "https://public.api.bsky.app" });

/** An agent for reading the account's public records, without signing in. */
export async function reader(account) {
  return new AtpAgent({ service: await hostOf(account) });
}
