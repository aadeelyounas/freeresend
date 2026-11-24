/**
 * @jest-environment node
 */
jest.mock("@/lib/api-keys", () => ({
  verifyApiKey: jest.fn(async () => ({ id: "k", domain_id: "d", permissions: ["send"] })),
}));
jest.mock("@/lib/ses", () => ({ sendEmail: jest.fn(async () => "ses-id") }));
jest.mock("@/lib/domains", () => ({
  getDomainById: jest.fn(async () => ({ id: "d", domain: "example.com", status: "verified" })),
}));
jest.mock("@/lib/database", () => ({ query: jest.fn(async () => ({ rows: [{ id: "log-id" }] })) }));

import { NextRequest } from "next/server";
import { POST } from "../route";
import { sendEmail } from "@/lib/ses";
import { query } from "@/lib/database";

const send = (from: string) =>
  POST(
    new NextRequest("http://localhost/api/emails", {
      method: "POST",
      headers: { authorization: "Bearer frs_test" },
      body: JSON.stringify({ from, to: ["guard@example.org"], subject: "s", text: "t" }),
    })
  );

beforeEach(() => jest.clearAllMocks());

it("sends a bare address exactly as before", async () => {
  expect((await send("noreply@example.com")).status).toBe(200);
  expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ from: "noreply@example.com" }));
});

it("sends the display name, and logs the bare address", async () => {
  const res = await send("ShiftTracker <noreply@example.com>");
  expect(res.status).toBe(200);
  expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ from: '"ShiftTracker" <noreply@example.com>' }));
  expect((query as jest.Mock).mock.calls[0][1][2]).toBe("noreply@example.com");
});

it.each([
  "ShiftTracker <noreply@other.com>",
  "noreply@example.com <noreply@other.com>",
  "Evil\r\nBcc: victim@example.net <noreply@example.com>",
  "ShiftTracker <nope>",
])("refuses %j", async (from) => {
  expect((await send(from)).status).toBe(400);
  expect(sendEmail).not.toHaveBeenCalled();
});
