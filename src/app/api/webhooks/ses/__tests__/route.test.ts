/**
 * @jest-environment node
 */
jest.mock("@/lib/database", () => ({ query: jest.fn() }));

import { createSign, generateKeyPairSync, type KeyObject } from "crypto";
import { NextRequest } from "next/server";
import { query } from "@/lib/database";
import { POST } from "../route";

const TOPIC = "arn:aws:sns:eu-west-2:000000000000:ses-events";
const CERT = "https://sns.eu-west-2.amazonaws.com/SimpleNotificationService-test.pem";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const attacker = generateKeyPairSync("rsa", { modulusLength: 2048 });

const event = (extra = {}) =>
  JSON.stringify({ eventType: "delivery", mail: { messageId: "ses-1" }, ...extra });

function notification(overrides: Record<string, string> = {}, key: KeyObject = privateKey) {
  const body: Record<string, string> = {
    Type: "Notification",
    MessageId: "m-1",
    TopicArn: TOPIC,
    Message: event(),
    Timestamp: new Date().toISOString(),
    SignatureVersion: "2",
    SigningCertURL: CERT,
    ...overrides,
  };
  const text = ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
    .filter((k) => body[k] !== undefined)
    .map((k) => `${k}\n${body[k]}\n`)
    .join("");
  const algorithm = body.SignatureVersion === "1" ? "RSA-SHA1" : "RSA-SHA256";
  return { Signature: createSign(algorithm).update(text).sign(key, "base64"), ...body };
}

const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/webhooks/ses", { method: "POST", body: JSON.stringify(body) }));
const fetchMock = jest.fn();

beforeEach(() => {
  process.env.SNS_TOPIC_ARN = TOPIC;
  global.fetch = fetchMock.mockReset().mockImplementation(async () => new Response(String(publicKey.export({ type: "spki", format: "pem" }))));
  (query as jest.Mock).mockReset().mockImplementation(async (sql: string) => ({
    // pg returns jsonb columns parsed
    rows: sql.startsWith("SELECT") ? [{ id: "log-1", status: "sent", to_emails: ["guard@example.org"], cc_emails: [] }] : [],
  }));
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

it.each(["1", "2"])("records an event that SNS signed (signature version %s)", async (SignatureVersion) => {
  expect((await post(notification({ SignatureVersion }))).status).toBe(200);
  expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE email_logs"), expect.arrayContaining(["delivered", "log-1"]));
});

const refused: [string, () => unknown][] = [
  ["no signature", () => ({ Type: "Notification", TopicArn: TOPIC, Message: event() })],
  ["a signature by another key", () => notification({}, attacker.privateKey)],
  ["a changed message", () => ({ ...notification(), Message: event({ eventType: "bounce" }) })],
  ["another topic, correctly signed", () => notification({ TopicArn: "arn:aws:sns:eu-west-2:999999999999:attacker" })],
  ["an old message", () => notification({ Timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() })],
  ["junk that would be stored", () => ({ Type: "Notification", Message: JSON.stringify({ eventType: "x", junk: "y" }) })],
];
it.each(refused)("refuses %s and writes nothing", async (_name, body) => {
  expect((await post(body())).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
});

it.each([
  "http://sns.eu-west-2.amazonaws.com/a.pem",
  "https://sns.eu-west-2.amazonaws.com.evil.example/a.pem",
  "https://evil.example/sns.eu-west-2.amazonaws.com/a.pem",
  "https://sns.eu-west-2.amazonaws.com@evil.example/a.pem",
  "https://169.254.169.254/a.pem",
  "https://sns.eu-west-2.amazonaws.com:8443/a.pem",
  "https://mybucket.s3.amazonaws.com/a.pem",
])("does not fetch a certificate from %s", async (SigningCertURL) => {
  expect((await post(notification({ SigningCertURL }))).status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("refuses everything while no topic is configured", async () => {
  delete process.env.SNS_TOPIC_ARN;
  expect((await post(notification())).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
});
