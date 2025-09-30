import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SpotifyAuth } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    // Check if Spotify credentials are configured
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json({
        error: "Spotify API not configured",
        playback: null
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
        playback: null
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
        playback: null
      }, { status: 401 });
    }

    // Get current playback state
    const playback = await SpotifyAuth.getCurrentPlayback(tokenResult.accessToken);
    const devices = await SpotifyAuth.getAvailableDevices(tokenResult.accessToken);

    // Update cookies if token was refreshed
    if (tokenResult.updatedTokens) {
      const response = NextResponse.json({ playback, devices });
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

    return NextResponse.json({ playback, devices });

  } catch (error) {
    console.error("Playback fetch error:", error);

    return NextResponse.json({
      error: "Failed to fetch playback state. Please try again later.",
      playback: null
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if Spotify credentials are configured
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json({
        error: "Spotify API not configured"
      }, { status: 503 });
    }

    // Get user tokens from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("spotify_access_token")?.value;
    const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
    const expiresAt = cookieStore.get("spotify_token_expires")?.value;

    if (!accessToken || !refreshToken || !expiresAt) {
      return NextResponse.json({
        error: "User not authenticated with Spotify"
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
        error: "Failed to get valid access token. Please log out and log back in."
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, trackUri, deviceId, volumePercent } = body;

    if (!action) {
      return NextResponse.json({
        error: "Action is required"
      }, { status: 400 });
    }

    // Execute the requested action
    switch (action) {
      case "play":
        if (!trackUri) {
          return NextResponse.json({
            error: "Track URI is required for play action"
          }, { status: 400 });
        }
        await SpotifyAuth.playTrack(tokenResult.accessToken, trackUri, deviceId);
        break;

      case "pause":
        await SpotifyAuth.pausePlayback(tokenResult.accessToken, deviceId);
        break;

      case "next":
        await SpotifyAuth.skipToNext(tokenResult.accessToken, deviceId);
        break;

      case "previous":
        await SpotifyAuth.skipToPrevious(tokenResult.accessToken, deviceId);
        break;

      case "volume":
        if (volumePercent === undefined || volumePercent === null) {
          return NextResponse.json({
            error: "Volume percent is required for volume action"
          }, { status: 400 });
        }
        await SpotifyAuth.setVolume(tokenResult.accessToken, volumePercent, deviceId);
        break;

      default:
        return NextResponse.json({
          error: "Invalid action. Supported actions: play, pause, next, previous, volume"
        }, { status: 400 });
    }

    // Update cookies if token was refreshed
    if (tokenResult.updatedTokens) {
      const response = NextResponse.json({ success: true });
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

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Playback control error:", error);

    // Handle specific Spotify API errors
    if (error instanceof Error) {
      if (error.message.includes("credentials not configured")) {
        return NextResponse.json({
          error: error.message
        }, { status: 503 });
      }

      if (error.message.includes("Restriction violated")) {
        return NextResponse.json({
          error: "Playback not available on this device. Try playing on another device first."
        }, { status: 403 });
      }

      if (error.message.includes("Device not found")) {
        return NextResponse.json({
          error: "No active Spotify device found. Please start playback on the Spotify app first."
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      error: "Failed to control playback. Please try again later."
    }, { status: 500 });
  }
}