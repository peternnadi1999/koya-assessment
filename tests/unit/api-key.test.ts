import { describe, expect, it } from "vitest";
import { verifyApiKey } from "@/server/auth/api-key";

describe("verifyApiKey", () => {
  it("accepts the matching key", () => {
    expect(verifyApiKey("secret-key-123", "secret-key-123")).toBe(true);
  });

  it("rejects a wrong key", () => {
    expect(verifyApiKey("nope", "secret-key-123")).toBe(false);
  });

  it("rejects missing or empty keys", () => {
    expect(verifyApiKey(null, "secret-key-123")).toBe(false);
    expect(verifyApiKey(undefined, "secret-key-123")).toBe(false);
    expect(verifyApiKey("", "secret-key-123")).toBe(false);
  });
});
