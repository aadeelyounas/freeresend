/**
 * @jest-environment node
 */
jest.mock("nanoid", () => ({ nanoid: () => "x" }));
jest.mock("../database", () => ({ query: jest.fn() }));

import bcrypt from "bcryptjs";
import { query } from "../database";
import { verifyApiKey } from "../api-keys";

const KEY = "frs_abcdefgh_" + "s".repeat(32);
const compare = jest.spyOn(bcrypt, "compare");
let rows: { id: string; key_hash: string; permissions: string[] }[];

beforeEach(() => {
  compare.mockClear();
  rows = [{ id: Math.random().toString(), key_hash: bcrypt.hashSync(KEY, 4), permissions: ["send"] }];
  (query as jest.Mock).mockImplementation(async (sql: string) => ({ rows: sql.startsWith("SELECT") ? rows : [] }));
});

it("runs bcrypt once for a key that keeps passing", async () => {
  for (let i = 0; i < 5; i++) expect(await verifyApiKey(KEY)).toMatchObject({ permissions: ["send"] });
  expect(compare).toHaveBeenCalledTimes(1);
});

it("refuses a wrong secret after the right one passed, every time", async () => {
  await verifyApiKey(KEY);
  for (let i = 0; i < 3; i++) expect(await verifyApiKey(KEY.slice(0, -1) + "x")).toBeNull();
  expect(compare).toHaveBeenCalledTimes(4);
});

it("refuses a deleted key at once", async () => {
  await verifyApiKey(KEY);
  rows = [];
  expect(await verifyApiKey(KEY)).toBeNull();
});

it("refuses the old key once its stored hash changes", async () => {
  await verifyApiKey(KEY);
  rows[0].key_hash = bcrypt.hashSync("frs_abcdefgh_other", 4);
  expect(await verifyApiKey(KEY)).toBeNull();
});

it("reads permissions fresh", async () => {
  await verifyApiKey(KEY);
  rows[0].permissions = [];
  expect((await verifyApiKey(KEY))!.permissions).toEqual([]);
});
