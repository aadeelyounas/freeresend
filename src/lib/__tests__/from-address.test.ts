/**
 * @jest-environment node
 */
import { formatFromAddress, parseFromAddress } from "../from-address";

describe("parseFromAddress", () => {
  it("accepts a bare address", () => {
    expect(parseFromAddress("noreply@example.com")).toEqual({ email: "noreply@example.com" });
  });

  it.each([
    ["ShiftTracker <noreply@example.com>", "ShiftTracker"],
    ['"Acme, Ltd" <noreply@example.com>', "Acme, Ltd"],
    ["Acme, Ltd <noreply@example.com>", "Acme, Ltd"],
    ['"Say \\"hi\\"" <noreply@example.com>', 'Say "hi"'],
  ])("accepts %s", (value, name) => {
    expect(parseFromAddress(value)).toEqual({ email: "noreply@example.com", name });
  });

  it("treats an empty name as none", () => {
    expect(parseFromAddress("<noreply@example.com>")).toEqual({ email: "noreply@example.com" });
  });

  it.each([
    "not-an-email",
    "ShiftTracker <ShiftTracker>",
    "ShiftTracker <noreply@example.com",
    "A <a@example.com> B <b@example.com>",
    "a@example.com, b@example.com",
    "Evil\r\nBcc: victim@example.net <noreply@example.com>",
    "Evil\nBcc: victim@example.net <noreply@example.com>",
    "noreply@example.com\r\n",
    '"Evil\\\r\nBcc: x" <noreply@example.com>',
    `${"x".repeat(101)} <noreply@example.com>`,
  ])("rejects %j", (value) => {
    expect(parseFromAddress(value)).toBeNull();
  });
});

describe("formatFromAddress", () => {
  it("leaves a bare address alone", () => {
    expect(formatFromAddress({ email: "a@example.com" })).toBe("a@example.com");
  });

  it("quotes and escapes an ASCII name", () => {
    expect(formatFromAddress({ email: "a@example.com", name: "ShiftTracker" })).toBe('"ShiftTracker" <a@example.com>');
    expect(formatFromAddress({ email: "a@example.com", name: 'A\\B "C"' })).toBe('"A\\\\B \\"C\\"" <a@example.com>');
  });

  it("encodes a non-ASCII name as RFC 2047 words of at most 75 characters", () => {
    const name = "Zażółć gęślą jaźń — Café Sécurité Générale et Fils 🛡️ Société";
    const out = formatFromAddress({ email: "a@example.com", name });
    const words = out.replace(" <a@example.com>", "").split(" ");
    const decoded = words.map((w) => {
      expect(w.length).toBeLessThanOrEqual(75);
      return Buffer.from(w.match(/^=\?UTF-8\?B\?(.+)\?=$/)![1], "base64").toString("utf8");
    });
    expect(decoded.join("")).toBe(name);
  });
});
