import { z } from "zod";

export interface FromAddress {
  email: string;
  name?: string;
}

const MAX_NAME_LENGTH = 100;

/**
 * Parses a sender given as `addr`, `Name <addr>` or `"Name" <addr>`. Returns null for anything else.
 * Control characters are refused: sendRawEmail writes the sender into the raw headers, so a line break would let
 * the caller add headers.
 */
export function parseFromAddress(value: string): FromAddress | null {
  if (/[\x00-\x1f\x7f]/.test(value)) return null;

  const match = value.trim().match(/^(?:"((?:[^"\\]|\\.)*)"|([^"<>]*))\s*<([^<>]*)>$/);
  const email = match ? match[3] : value.trim();
  if (!z.string().email().safeParse(email).success) return null;

  const name = (match?.[1]?.replace(/\\(.)/g, "$1") ?? match?.[2] ?? "").trim();
  if (name.length > MAX_NAME_LENGTH) return null;
  return name ? { email, name } : { email };
}

/** Builds the header value: the name quoted, or RFC 2047 encoded when it is not ASCII. */
export function formatFromAddress({ email, name }: FromAddress): string {
  if (!name) return email;
  if (/^[\x20-\x7e]*$/.test(name)) return `"${name.replace(/(["\\])/g, "\\$1")}" <${email}>`;

  // An encoded word is at most 75 characters, so at most 45 bytes of UTF-8, and may not split a character.
  const words: string[] = [];
  let word = "";
  for (const char of name) {
    if (Buffer.byteLength(word + char) > 45) {
      words.push(word);
      word = "";
    }
    word += char;
  }
  words.push(word);
  return `${words.map((w) => `=?UTF-8?B?${Buffer.from(w).toString("base64")}?=`).join(" ")} <${email}>`;
}
