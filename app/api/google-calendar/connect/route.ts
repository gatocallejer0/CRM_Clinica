import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/roles";
import { buildGoogleAuthUrl } from "@/lib/google-calendar";

const STAFF_ROLES = ["Admin", "Doctor", "Recepción"];

export async function GET(request: NextRequest) {
  await requireRole(STAFF_ROLES);

  const state = crypto.randomUUID();
  const redirectUri = `${request.nextUrl.origin}/api/google-calendar/callback`;

  const response = NextResponse.redirect(buildGoogleAuthUrl(redirectUri, state));
  response.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  return response;
}
