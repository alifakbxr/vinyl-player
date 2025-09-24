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
}

interface SearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
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
        error: "Spotify API not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file.",
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
    const validAccessToken = await SpotifyAuth.getValidAccessToken(userTokens);

    let tracks;
    if (validAccessToken && userTokens) {
      // Use user token for authenticated search (more results, better data)
      tracks = await searchWithUserToken(validAccessToken, query);
    } else {
      // Fall back to client credentials (public search)
      tracks = await searchWithClientCredentials(query);
    }

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

    // For other errors, return a generic error message
    return NextResponse.json({
      error: "Failed to search tracks. Please try again later.",
      tracks: []
    }, { status: 500 });
  }
}