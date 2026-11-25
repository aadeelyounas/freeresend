/**
 * @jest-environment node
 */
jest.mock("@/lib/auth", () => ({
  authenticateUser: jest.fn(async (email: string, password: string) =>
    password === "right" ? { id: "u", email } : null
  ),
  generateJWT: () => "token",
}));

import { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth";

let POST: (request: NextRequest) => Promise<Response>;
let checks: jest.Mock;

// Each test gets a fresh module, so fresh counters.
beforeEach(() => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    POST = require("../route").POST;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    checks = require("@/lib/auth").authenticateUser as jest.Mock;
  });
  checks.mockClear();
  void authenticateUser;
});

const login = (body: unknown, ip = "203.0.113.1") =>
  POST(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "x-real-ip": ip },
      body: JSON.stringify(body),
    })
  );
const wrong = (email = "a@example.com", ip?: string) => login({ email, password: "wrong" }, ip);
const anyIp = (i: number) => `10.${i >> 8}.${i & 255}.1`;

it("refuses the 11th failure from one address, even with the right password, without checking it", async () => {
  for (let i = 0; i < 10; i++) expect((await wrong(`u${i}@example.com`)).status).toBe(401);
  checks.mockClear();
  const refused = await login({ email: "a@example.com", password: "right" });
  expect(refused.status).toBe(429);
  expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
  expect((await refused.json()).error).toMatch(/Too many attempts/);
  expect(checks).not.toHaveBeenCalled();
  expect((await login({ email: "a@example.com", password: "right" }, "203.0.113.2")).status).toBe(200);
});

it("cannot be passed by sending every try at once", async () => {
  const statuses = await Promise.all(Array.from({ length: 40 }, (_, i) => wrong(`u${i}@example.com`)));
  expect(statuses.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(30);
  expect(checks.mock.calls.length).toBeLessThanOrEqual(10);
});

it("runs one password check at a time, and lets go when it fails", async () => {
  let release = (_: unknown) => {};
  const held = new Promise((resolve) => (release = resolve));
  checks.mockImplementationOnce(() => held.then(() => Promise.reject(new Error("db"))));
  const running = wrong("a@example.com", anyIp(1));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect((await wrong("c@example.com", anyIp(3))).status).toBe(429);
  expect(checks).toHaveBeenCalledTimes(1);
  jest.spyOn(console, "error").mockImplementation(() => {});
  release(null);
  expect((await running).status).toBe(500);
  expect((await wrong("c@example.com", anyIp(3))).status).toBe(401);
});

it("limits one account however many addresses the tries come from, and however it is written", async () => {
  for (let i = 0; i < 20; i++) await wrong(i % 2 ? "Owner@Example.com" : "owner@example.com", anyIp(i));
  expect((await wrong("OWNER@example.com", anyIp(99))).status).toBe(429);
  expect((await wrong("other@example.com", anyIp(100))).status).toBe(401);
});

it("limits all password checks together, so bcrypt cannot starve the sending of email", async () => {
  for (let i = 0; i < 150; i++) await wrong(`u${i}@example.com`, anyIp(i));
  expect(checks).toHaveBeenCalledTimes(40);
});

it("does not count a sign-in that works", async () => {
  for (let i = 0; i < 40; i++) expect((await login({ email: "a@example.com", password: "right" })).status).toBe(200);
});

it("malformed requests use up the address, but not everybody's password checks", async () => {
  for (let i = 0; i < 10; i++) expect((await login({})).status).toBe(400);
  expect((await login({})).status).toBe(429);
  for (let i = 0; i < 300; i++) await login({}, anyIp(i));
  expect((await login({ email: "a@example.com", password: "right" }, "203.0.113.9")).status).toBe(200);
});
