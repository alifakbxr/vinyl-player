import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("spotify_access_token")?.value;
    const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
    const expiresAt = cookieStore.get("spotify_token_expires")?.value;

    const isAuthenticated = !!(accessToken && refreshToken && expiresAt);

    return NextResponse.json({
      authenticated: isAuthenticated,
      hasTokens: !!(accessToken && refreshToken),
      expiresAt: expiresAt ? parseInt(expiresAt) : null,
    });
  } catch (error) {
    console.error("Auth status check error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}