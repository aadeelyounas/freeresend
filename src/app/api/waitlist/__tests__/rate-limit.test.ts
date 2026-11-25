/**
 * @jest-environment node
 */
jest.mock("nanoid", () => ({ nanoid: () => "x" }));
jest.mock("@/lib/notifications", () => ({ sendWaitlistNotification: jest.fn(), sendWelcomeEmail: jest.fn() }));
jest.mock("@/lib/database", () => ({
  query: jest.fn(),
  getWaitlistSignupByEmail: jest.fn(async () => null),
  createWaitlistSignup: jest.fn(async (d: { email: string }) => ({ id: "1", email: d.email, created_at: "x" })),
}));

import { NextRequest } from "next/server";

let POST: (request: NextRequest) => Promise<Response>;
let welcome: jest.Mock;

beforeEach(() => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    POST = require("../route").POST;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    welcome = require("@/lib/notifications").sendWelcomeEmail;
  });
});

const join = (i: number, ip: string) =>
  POST(
    new NextRequest("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "x-real-ip": ip },
      body: JSON.stringify({ email: `stranger${i}@example.com` }),
    })
  );

it("sends at most 5 welcome emails an hour for one address", async () => {
  for (let i = 0; i < 5; i++) expect((await join(i, "203.0.113.1")).status).toBe(201);
  const refused = await join(6, "203.0.113.1");
  expect(refused.status).toBe(429);
  expect(refused.headers.get("retry-after")).toBeTruthy();
  expect((await refused.json()).message).toMatch(/Too many/);
  expect(welcome).toHaveBeenCalledTimes(5);
});

it("sends at most 30 an hour in all, whatever address they claim", async () => {
  for (let i = 0; i < 60; i++) await join(i, `10.0.${i}.1`);
  expect(welcome).toHaveBeenCalledTimes(30);
});
