import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseServerKey, normalizeSupabaseUrl, noStoreSupabaseFetch } from "./supabase";

const originalSecret = process.env.SUPABASE_SECRET_KEY;
const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = originalSecret;
  if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
  if (originalAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
});

describe("getSupabaseServerKey", () => {
  it("prefers a current secret key over legacy and browser keys", () => {
    process.env.SUPABASE_SECRET_KEY = "secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";

    expect(getSupabaseServerKey()).toBe("secret");
  });
});

describe("normalizeSupabaseUrl", () => {
  it("converts a copied REST endpoint to the project base URL", () => {
    expect(normalizeSupabaseUrl("https://project.supabase.co/rest/v1/")).toBe(
      "https://project.supabase.co/",
    );
  });
});

describe("noStoreSupabaseFetch", () => {
  it("forces live database reads instead of Next data-cache responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await noStoreSupabaseFetch("https://project.supabase.co/rest/v1/audits", {
      headers: { apikey: "redacted" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/audits",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
