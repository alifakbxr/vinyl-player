import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SpotifyAuth } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    // Check if Spotify credentials are configured
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json({
        error: "Spotify API not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file with valid credentials from https://developer.spotify.com/dashboard",
        playlists: []
      }, { status: 503 });
    }

    // Get user tokens from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("spotify_access_token")?.value;
    const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
    const expiresAt = cookieStore.get("spotify_token_expires")?.value;

    if (!accessToken || !refreshToken || !expiresAt) {
      return NextResponse.json({
        error: "User not authenticated with Spotify",
        playlists: []
      }, { status: 401 });
    }

    const userTokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: parseInt(expiresAt),
    };

    // Get a valid access token
    const tokenResult = await SpotifyAuth.getValidAccessToken(userTokens);

    if (!tokenResult) {
      return NextResponse.json({
        error: "Failed to get valid access token. Please log out and log back in.",
        playlists: []
      }, { status: 401 });
    }

    // Fetch user playlists
    const playlists = await SpotifyAuth.getUserPlaylists(tokenResult.accessToken);

    // Update cookies if token was refreshed
    if (tokenResult.updatedTokens) {
      const response = NextResponse.json({ playlists });
      const expiresAt = tokenResult.updatedTokens.expires_at;

      response.cookies.set("spotify_access_token", tokenResult.updatedTokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Math.floor((expiresAt - Date.now()) / 1000),
      });

      response.cookies.set("spotify_token_expires", expiresAt.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Math.floor((expiresAt - Date.now()) / 1000),
      });

      return response;
    }

    return NextResponse.json({ playlists });

  } catch (error) {
    console.error("Playlists fetch error:", error);

    // Handle specific Spotify API errors
    if (error instanceof Error) {
      if (error.message.includes("credentials not configured")) {
        return NextResponse.json({
          error: error.message,
          playlists: []
        }, { status: 503 });
      }

      return NextResponse.json({
        error: "Failed to fetch playlists. Please try again later.",
        playlists: []
      }, { status: 500 });
    }

    return NextResponse.json({
      error: "Failed to fetch playlists. Please try again later.",
      playlists: []
    }, { status: 500 });
  }
}