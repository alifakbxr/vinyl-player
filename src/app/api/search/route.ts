import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { SpotifyAuth } from "@/lib/spotify";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  uri: string;
  duration_ms: number;
}


async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Failed to get Spotify access token:", error);
    throw new Error("Failed to authenticate with Spotify");
  }
}

async function searchWithUserToken(accessToken: string, query: string) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.tracks.items.map((track: SpotifyTrack) => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      album_cover: track.album.images[0]?.url || "https://via.placeholder.com/300x300?text=No+Image",
      preview_url: track.preview_url,
      spotify_uri: track.uri,
      spotify_url: track.external_urls.spotify,
      duration_ms: track.duration_ms,
      is_full_track_available: false, // Client credentials don't provide full track access
    }));
  } catch (error) {
    console.error("User token search failed:", error);
    throw error;
  }
}

async function searchWithClientCredentials(query: string) {
  const accessToken = await getSpotifyAccessToken();

  const response = await axios.get(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    }
  );

  return response.data.tracks.items.map((track: SpotifyTrack) => ({
    id: track.id,
    title: track.name,
    artist: track.artists[0]?.name || "Unknown Artist",
    album_cover: track.album.images[0]?.url || "https://via.placeholder.com/300x300?text=No+Image",
    preview_url: track.preview_url,
    spotify_uri: track.uri,
    spotify_url: track.external_urls.spotify,
    duration_ms: track.duration_ms,
    is_full_track_available: !!track.preview_url, // For now, use preview availability as indicator
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  try {
    // Check if Spotify credentials are configured
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json({
        error: "Spotify API not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file with valid credentials from https://developer.spotify.com/dashboard",
        tracks: []
      }, { status: 503 });
    }

    // Check if credentials are still placeholder values
    if (process.env.SPOTIFY_CLIENT_ID === "your_actual_client_id_here" ||
        process.env.SPOTIFY_CLIENT_SECRET === "your_actual_client_secret_here" ||
        process.env.SPOTIFY_CLIENT_ID === "a703c5ee2c4e44f388684d905e8ba99c") {
      return NextResponse.json({
        error: "Spotify API credentials are still set to placeholder values. Please replace them with real credentials from your Spotify app dashboard.",
        tracks: []
      }, { status: 503 });
    }

    // Try to get user tokens from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("spotify_access_token")?.value;
    const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
    const expiresAt = cookieStore.get("spotify_token_expires")?.value;

    let userTokens = null;
    if (accessToken && refreshToken && expiresAt) {
      userTokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt),
      };
    }

    // Get a valid access token (user token if available, otherwise client credentials)
    const tokenResult = await SpotifyAuth.getValidAccessToken(userTokens);

    let tracks;
    if (tokenResult && userTokens) {
      // Use user token for authenticated search (more results, better data)
      tracks = await searchWithUserToken(tokenResult.accessToken, query);

      // If token was refreshed, update cookies
      if (tokenResult.updatedTokens) {
        const response = NextResponse.json({ tracks });
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
    } else {
      // Fall back to client credentials (public search)
      tracks = await searchWithClientCredentials(query);
    }

    // Return the response
    return NextResponse.json({ tracks });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Search error:", error);

    // If it's a configuration error, return a helpful message
    if (error instanceof Error && error.message.includes("credentials not configured")) {
      return NextResponse.json({
        error: error.message,
        tracks: []
      }, { status: 503 });
    }

    // Handle specific Spotify API errors
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      if (status === 401) {
        return NextResponse.json({
          error: "Authentication failed. Please log out and log back in with Spotify.",
          tracks: []
        }, { status: 401 });
      } else if (status === 429) {
        return NextResponse.json({
          error: "Rate limit exceeded. Please try again in a moment.",
          tracks: []
        }, { status: 429 });
      } else if (status >= 500) {
        return NextResponse.json({
          error: "Spotify service is temporarily unavailable. Please try again later.",
          tracks: []
        }, { status: 502 });
      }
    }

    // For other errors, return a generic error message
    return NextResponse.json({
      error: "Failed to search tracks. Please try again later.",
      tracks: []
    }, { status: 500 });
  }
}