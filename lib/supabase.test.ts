import { afterEach, describe, expect, it } from "vitest";

import { getSupabaseServerKey } from "./supabase";

const originalSecret = process.env.SUPABASE_SECRET_KEY;
const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
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
