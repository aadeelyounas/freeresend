import { NextResponse } from "next/server";
import { initializeDefaultUser } from "@/lib/auth";

export async function POST() {
  try {
    await initializeDefaultUser();

    return NextResponse.json({
      success: true,
      message: "Default user initialized successfully",
    });
  } catch (error: unknown) {
    console.error("Setup failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Setup failed",
      },
      { status: 500 }
    );
  }
}
