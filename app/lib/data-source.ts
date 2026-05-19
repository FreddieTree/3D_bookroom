/** Central toggle for bridging mock catalogs vs networked stores. */

/**
 * When `NEXT_PUBLIC_USE_REAL_DB === "true"`, adapters may hydrate from `/api/*`.
 * Until member 2/3 pipelines land, prod shell keeps this off so UI avoids HTTP waterfalls.
 */
export const USE_REAL_DB = process.env.NEXT_PUBLIC_USE_REAL_DB === "true";

/** Example fetch pattern for bookshelf migration (invoke only when `USE_REAL_DB`). */
export async function fetchBooksFromApi(baseUrl?: string): Promise<unknown[]> {
  if (!USE_REAL_DB) {
    throw new Error("[data-source] fetchBooksFromApi called while USE_REAL_DB is false.");
  }

  const root = baseUrl ?? (typeof window === "undefined" ? "" : window.location.origin);
  const url = `${root.replace(/\/$/, "")}/api/books`;

  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    throw new Error(`[data-source] /api/books failed with ${res.status}`);
  }

  return res.json() as Promise<unknown[]>;
}
