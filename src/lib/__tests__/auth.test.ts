/**
 * @jest-environment node
 */
// auth.ts reads the secret when it loads, which is before any statement here but after this factory.
jest.mock("../database", () => {
  process.env.NEXTAUTH_SECRET = "test-secret";
  return { query: jest.fn(async () => ({ rows: [] })) };
});

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateUser, generateJWT, verifyJWT } from "../auth";

it("checks a password even when the user does not exist, so the answer takes as long", async () => {
  const compare = jest.spyOn(bcrypt, "compare");
  expect(await authenticateUser("nobody@example.com", "x")).toBeNull();
  expect(compare).toHaveBeenCalledTimes(1);
});

it("accepts its own tokens and no other algorithm", () => {
  const user = { id: "u", email: "a@example.com" };
  expect(verifyJWT(generateJWT(user))).toMatchObject(user);
  expect(verifyJWT(jwt.sign(user, "test-secret", { algorithm: "HS512" }))).toBeNull();
  expect(verifyJWT(jwt.sign(user, "", { algorithm: "none" }))).toBeNull();
});
