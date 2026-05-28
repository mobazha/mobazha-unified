import { headers } from 'next/headers';

/** Set by src/proxy.ts so Server Components can read query params (e.g. peerID). */
export const REQUEST_URL_HEADER = 'x-mobazha-request-url';

export async function getRequestUrl(): Promise<URL | null> {
  const headerList = await headers();
  const raw = headerList.get(REQUEST_URL_HEADER);
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export async function getRequestSearchParam(name: string): Promise<string | undefined> {
  const url = await getRequestUrl();
  return url?.searchParams.get(name) ?? undefined;
}
