/**
 * @jest-environment node
 */
jest.mock("nanoid", () => ({ nanoid: () => "x" }));
// auth.ts reads the secret when it loads, which is before any statement here but after this factory.
jest.mock("@/lib/database", () => ({
  __secret: (process.env.NEXTAUTH_SECRET = "test-secret"),
  query: jest.fn(),
  getWaitlistAnalytics: jest.fn(async () => ({ total_signups: 1 })),
  getAllWaitlistSignups: jest.fn(async () => [{ email: "private@example.com" }]),
  exportWaitlistSignups: jest.fn(async () => [{ id: "1", email: "=cmd|'/c calc'!A1", current_provider: 'a"b', created_at: "x", updated_at: "x" }]),
}));

import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { GET as list } from "../route";
import { GET as exportCsv } from "../export/route";

const call = async (handler: unknown, token?: string) =>
  (handler as (r: NextRequest) => Promise<Response>)(
    new NextRequest("http://localhost/api/waitlist", { headers: token ? { authorization: `Bearer ${token}` } : {} })
  );
const admin = () => jwt.sign({ id: "u", email: "a@example.com" }, "test-secret");

it.each([["list", list], ["export", exportCsv]])("%s needs a signed-in admin", async (_name, handler) => {
  const anonymous = await call(handler);
  expect(anonymous.status).toBe(401);
  expect(await anonymous.text()).not.toContain("@example.com");
  expect((await call(handler, jwt.sign({ id: "u" }, "wrong-secret"))).status).toBe(401);
  expect((await call(handler, admin())).status).toBe(200);
});

it("the CSV cannot start a spreadsheet formula or break out of a cell", async () => {
  const csv = await (await call(exportCsv, admin())).text();
  expect(csv).toContain(`"'=cmd|'/c calc'!A1"`);
  expect(csv).toContain('"a""b"');
});
