import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, generateJWT } from "@/lib/auth";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required").max(1024),
});

// Failed tries only: a sign-in that works gives its tries back.
const WINDOW_MS = 15 * 60 * 1000;
const perAddress = createRateLimiter(10, WINDOW_MS);
const perAccount = createRateLimiter(20, WINDOW_MS);
// A password check is a quarter of a second of CPU, which the sending of email shares.
const allChecks = createRateLimiter(40, WINDOW_MS);
// Measured: 60 callers guessing without this held a send for 70 seconds, and senders give up after 20.
const MAX_AT_ONCE = 1;
let checksRunning = 0;

function tooMany(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return NextResponse.json(
    { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return cors(new NextResponse(null, { status: 200 }));
  }

  try {
    // Counted before the check, not after, so tries sent all at once are counted too
    const address = clientIp(request.headers);
    const wait = perAddress.take(address);
    if (wait) return cors(tooMany(wait));

    // Parse and validate request
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    const { email, password } = validatedData;

    const account = email.toLowerCase();
    const busy = checksRunning >= MAX_AT_ONCE ? 1 : perAccount.take(account) || allChecks.take("all");
    if (busy) return cors(tooMany(busy));

    checksRunning++;
    const user = await authenticateUser(email, password).finally(() => checksRunning--);
    if (!user) {
      return cors(NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      ));
    }

    perAddress.giveBack(address);
    perAccount.giveBack(account);
    allChecks.giveBack("all");

    const token = generateJWT(user);

    return cors(NextResponse.json({
      success: true,
      data: {
        user,
        token,
      },
    }));
  } catch (error: unknown) {
    const errorObj = error as { errors?: unknown; message?: string };
    if (errorObj.errors || errorObj.message?.includes('validation') || errorObj.message?.includes('parse')) {
      return cors(NextResponse.json(
        {
          error: "Invalid request data",
          details: errorObj.errors || errorObj.message,
        },
        { status: 400 }
      ));
    }

    console.error("API Error:", error);
    return cors(NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ));
  }
}
