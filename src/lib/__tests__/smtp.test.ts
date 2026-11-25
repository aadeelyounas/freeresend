/**
 * @jest-environment node
 */
const send = jest.fn();
jest.mock("@aws-sdk/client-iam", () => {
  const command = (name: string) => class { constructor(public input: unknown, public kind = name) {} };
  return {
    IAMClient: class { send = (c: unknown) => send(c); },
    CreateUserCommand: command("CreateUser"),
    CreateAccessKeyCommand: command("CreateAccessKey"),
    DeleteUserCommand: command("DeleteUser"),
    DeleteAccessKeyCommand: command("DeleteAccessKey"),
    ListAccessKeysCommand: command("ListAccessKeys"),
    AttachUserPolicyCommand: command("AttachUserPolicy"),
    DetachUserPolicyCommand: command("DetachUserPolicy"),
  };
});
jest.mock("../database", () => ({ query: jest.fn() }));
jest.mock("../ses", () => ({}));
jest.mock("../digitalocean", () => ({}));

import { query } from "../database";
import { deleteDomain } from "../domains";
import { createSmtpCredentials, deleteSmtpCredentials } from "../smtp";

const named = (name: string) => Object.assign(new Error(name), { name });
const kinds = () => send.mock.calls.map(([c]) => c.kind);
let domain: Record<string, unknown>;

beforeEach(() => {
  send.mockReset().mockImplementation(async (c) =>
    c.kind === "ListAccessKeys" ? { AccessKeyMetadata: [{ AccessKeyId: "key" }] } : {}
  );
  domain = { id: "d", user_id: "u", domain: "example.com", smtp_credentials: { username: "key" } };
  (query as jest.Mock).mockReset().mockImplementation(async (sql: string) => ({ rows: sql.startsWith("SELECT") ? [domain] : [], rowCount: 1 }));
});

it("deleting a domain ends its SMTP credentials before the record goes", async () => {
  await deleteDomain("d", "u");
  expect(kinds()).toEqual(expect.arrayContaining(["DeleteAccessKey", "DeleteUser"]));
});

it("keeps the domain when its SMTP credentials could not be ended", async () => {
  send.mockRejectedValue(named("AccessDenied"));
  await expect(deleteDomain("d", "u")).rejects.toThrow();
  expect((query as jest.Mock).mock.calls.some(([sql]) => sql.startsWith("DELETE"))).toBe(false);
});

it("does not touch IAM for a domain without SMTP credentials", async () => {
  domain.smtp_credentials = null;
  await deleteDomain("d", "u");
  expect(send).not.toHaveBeenCalled();
});

it("says so when a revoke fails, and is content when the user is already gone", async () => {
  send.mockRejectedValue(named("AccessDenied"));
  await expect(deleteSmtpCredentials("example.com")).rejects.toThrow("AccessDenied");
  send.mockRejectedValue(named("NoSuchEntityException"));
  await expect(deleteSmtpCredentials("example.com")).resolves.toBeUndefined();
});

it("a name that is already taken does not delete the other domain's credentials", async () => {
  send.mockRejectedValue(named("EntityAlreadyExistsException"));
  await expect(createSmtpCredentials("a-b.com")).rejects.toThrow("EntityAlreadyExists");
  expect(kinds()).toEqual(["CreateUser"]);
});
