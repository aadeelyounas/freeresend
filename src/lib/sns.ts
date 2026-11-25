import { createVerify } from "crypto";
import { z } from "zod";

const snsSchema = z.object({
  Type: z.enum(["Notification", "SubscriptionConfirmation", "UnsubscribeConfirmation"]),
  MessageId: z.string(),
  TopicArn: z.string(),
  Message: z.string(),
  Timestamp: z.string(),
  SignatureVersion: z.enum(["1", "2"]),
  Signature: z.string(),
  SigningCertURL: z.string(),
  Subject: z.string().optional(),
  SubscribeURL: z.string().optional(),
  Token: z.string().optional(),
});

export type SnsMessage = z.infer<typeof snsSchema>;

const MAX_AGE_MS = 60 * 60 * 1000;
const certificates = new Map<string, string>();

// Only Amazon's SNS hosts: the URL is in the message, so the caller chooses it.
function isSnsCertUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(url.host) &&
      url.username === "" &&
      url.password === "" &&
      url.pathname.endsWith(".pem")
    );
  } catch {
    return false;
  }
}

async function getCertificate(url: string): Promise<string> {
  const known = certificates.get(url);
  if (known) return known;
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("SNS certificate not available");
  const pem = await response.text();
  if (certificates.size >= 10) certificates.clear();
  certificates.set(url, pem);
  return pem;
}

/**
 * The message, if Amazon SNS signed it for our topic within the last hour; otherwise null. The topic is checked as well
 * as the signature because anybody with an AWS account can have SNS sign a message for a topic of their own.
 */
export async function verifySnsMessage(body: unknown): Promise<SnsMessage | null> {
  const topic = process.env.SNS_TOPIC_ARN;
  const parsed = snsSchema.safeParse(body);
  if (!topic || !parsed.success) return null;

  const message = parsed.data;
  if (message.TopicArn !== topic || !isSnsCertUrl(message.SigningCertURL)) return null;
  // NaN, from a date that is not one, fails this too.
  if (!(Math.abs(Date.now() - Date.parse(message.Timestamp)) < MAX_AGE_MS)) return null;

  const fields =
    message.Type === "Notification"
      ? (["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"] as const)
      : (["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"] as const);
  const signed = fields
    .filter((field) => message[field] !== undefined)
    .map((field) => `${field}\n${message[field]}\n`)
    .join("");

  try {
    const algorithm = message.SignatureVersion === "1" ? "RSA-SHA1" : "RSA-SHA256";
    const valid = createVerify(algorithm)
      .update(signed)
      .verify(await getCertificate(message.SigningCertURL), message.Signature, "base64");
    return valid ? message : null;
  } catch (error) {
    console.error("SNS signature check failed:", error);
    return null;
  }
}
