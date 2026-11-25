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

const sendBody = (extra: Record<string, unknown>) =>
  POST(
    new NextRequest("http://localhost/api/emails", {
      method: "POST",
      headers: { authorization: "Bearer frs_test" },
      body: JSON.stringify({ from: "noreply@example.com", to: ["guard@example.org"], subject: "s", text: "t", ...extra }),
    })
  );
const sent = () => (sendEmail as jest.Mock).mock.calls[0][0];

it("a line break in the subject cannot add a header", async () => {
  expect((await sendBody({ subject: "Rota\r\nBcc: victim@example.net" })).status).toBe(200);
  expect(sent().subject).toBe("Rota Bcc: victim@example.net");
});

it("an attachment cannot add a header or a MIME part", async () => {
  const attachments = [{ filename: 'a"\r\nX: y.pdf', content: "aGk=", contentType: "text/html\r\nX: y" }];
  expect((await sendBody({ attachments })).status).toBe(200);
  expect(sent().attachments[0]).toMatchObject({ filename: "a X: y.pdf", contentType: "application/octet-stream" });
  expect((await sendBody({ attachments: [{ filename: "a", content: "aGk=\r\n--boundary" }] })).status).toBe(400);
});

it("keeps an ordinary attachment as it is", async () => {
  const attachments = [{ filename: "Rota – week 1.pdf", content: "aGk=\naGk=", contentType: "application/pdf" }];
  await sendBody({ attachments });
  expect(sent().attachments).toEqual(attachments);
});

it("logs a subject longer than its column", async () => {
  await sendBody({ subject: "x".repeat(600) });
  expect((query as jest.Mock).mock.calls[0][1][6]).toHaveLength(500);
  expect(sent().subject).toHaveLength(600);
});

it("sends to at most 50 addresses, the SES limit", async () => {
  const to = Array.from({ length: 51 }, (_, i) => `g${i}@example.org`);
  expect((await sendBody({ to })).status).toBe(400);
  expect((await sendBody({ to: to.slice(0, 30), bcc: to.slice(30) })).status).toBe(400);
  expect((await sendBody({ to: to.slice(0, 50) })).status).toBe(200);
});
