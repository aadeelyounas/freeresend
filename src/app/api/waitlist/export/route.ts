import { NextRequest, NextResponse } from "next/server";
import { exportWaitlistSignups, type WaitlistSignup } from "@/lib/database";
import { handleError, withAuth } from "@/lib/middleware";

// The values come from a public form. A leading = + - @ would run as a formula in a spreadsheet.
function cell(value: string | undefined): string {
  if (!value) return "";
  return `"${value.replace(/^(?=[=+\-@\t\r])/, "'").replace(/"/g, '""')}"`;
}

// Convert waitlist signups to CSV format
function convertToCSV(signups: WaitlistSignup[]): string {
  const headers = [
    "ID",
    "Email",
    "Estimated Volume",
    "Current Provider",
    "Referral Source",
    "User Agent",
    "IP Address",
    "UTM Source",
    "UTM Medium",
    "UTM Campaign",
    "Created At",
    "Updated At",
  ];

  const csvRows = [
    headers.join(","),
    ...signups.map((signup) =>
      [
        signup.id,
        cell(signup.email),
        signup.estimated_volume || "",
        cell(signup.current_provider),
        cell(signup.referral_source),
        cell(signup.user_agent),
        signup.ip_address || "",
        cell(signup.utm_source),
        cell(signup.utm_medium),
        cell(signup.utm_campaign),
        signup.created_at,
        signup.updated_at,
      ].join(",")
    ),
  ];

  return csvRows.join("\n");
}

// GET /api/waitlist/export - Export waitlist as CSV (admin only)
async function handleGet(): Promise<NextResponse> {
  try {
    // Get all waitlist signups
    const signups = await exportWaitlistSignups();

    // Convert to CSV
    const csvContent = convertToCSV(signups);

    // Generate filename with current date
    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `waitlist-export-${currentDate}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(req: NextRequest) {
  return withAuth(handleGet)(req);
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}