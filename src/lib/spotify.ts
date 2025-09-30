import axios from "axios";

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class SpotifyAuth {
  private static async refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Spotify credentials not configured");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        {
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token, expires_in } = response.data;
      const expires_at = Date.now() + (expires_in * 1000);

      return {
        access_token,
        refresh_token: refreshToken, // Keep the same refresh token
        expires_at,
      };
    } catch (error) {
      console.error("Failed to refresh Spotify token:", error);
      throw new Error("Failed to refresh access token");
    }
  }

  static async getValidAccessToken(tokens: SpotifyTokens | null): Promise<{ accessToken: string; updatedTokens?: SpotifyTokens } | null> {
    // If no tokens, return null (will fall back to client credentials)
    if (!tokens) {
      return null;
    }

    // If token is still valid, return it
    if (Date.now() < tokens.expires_at) {
      return { accessToken: tokens.access_token };
    }

    // If token is expired, try to refresh it
    try {
      const newTokens = await this.refreshAccessToken(tokens.refresh_token);
      return {
        accessToken: newTokens.access_token,
        updatedTokens: newTokens
      };
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return null; // Fall back to client credentials
    }
  }

  static getSpotifyAuthUrl(): string {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    const scope = "user-read-private user-read-email playlist-read-private playlist-read-collaborative";

    if (!clientId || !redirectUri) {
      throw new Error("Spotify credentials not configured");
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scope,
      show_dialog: "true",
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }
}