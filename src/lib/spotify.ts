import axios from "axios";

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  uri: string;
  duration_ms: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
  uri: string;
  owner: {
    display_name: string;
  };
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  country: string;
}

export interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
}

export interface SpotifyRecentlyPlayed {
  track: SpotifyTrack;
}

export interface SpotifySavedTrack {
  track: SpotifyTrack;
}

export interface SpotifyPlaybackBody {
  uris?: string[];
  device_id?: string;
  volume_percent?: number;
}

export interface SpotifyPlaybackState {
  device: {
    id: string;
    name: string;
    type: string;
    volume_percent: number;
  };
  shuffle_state: boolean;
  repeat_state: string;
  timestamp: number;
  context: {
    external_urls: {
      spotify: string;
    };
    href: string;
    type: string;
    uri: string;
  } | null;
  progress_ms: number;
  item: SpotifyTrack | null;
  currently_playing_type: string;
  actions: {
    disallows: {
      [key: string]: boolean;
    };
  };
  is_playing: boolean;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  volume_percent: number;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
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

  static async getUserProfile(accessToken: string): Promise<SpotifyUser> {
    try {
      const response = await axios.get("https://api.spotify.com/v1/me", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      throw new Error("Failed to fetch user profile");
    }
  }

  static async getUserPlaylists(accessToken: string, limit: number = 20): Promise<SpotifyPlaylist[]> {
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/me/playlists?limit=${limit}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.items;
    } catch (error) {
      console.error("Failed to fetch user playlists:", error);
      throw new Error("Failed to fetch user playlists");
    }
  }

  static async getPlaylistTracks(accessToken: string, playlistId: string): Promise<SpotifyTrack[]> {
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.items.map((item: SpotifyPlaylistTrack) => item.track);
    } catch (error) {
      console.error("Failed to fetch playlist tracks:", error);
      throw new Error("Failed to fetch playlist tracks");
    }
  }

  static async getRecentlyPlayed(accessToken: string, limit: number = 20): Promise<SpotifyTrack[]> {
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.items.map((item: SpotifyRecentlyPlayed) => item.track);
    } catch (error) {
      console.error("Failed to fetch recently played tracks:", error);
      throw new Error("Failed to fetch recently played tracks");
    }
  }

  static async getSavedTracks(accessToken: string, limit: number = 20): Promise<SpotifyTrack[]> {
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/me/tracks?limit=${limit}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.items.map((item: SpotifySavedTrack) => item.track);
    } catch (error) {
      console.error("Failed to fetch saved tracks:", error);
      throw new Error("Failed to fetch saved tracks");
    }
  }

  static async playTrack(accessToken: string, trackUri: string, deviceId?: string): Promise<void> {
    try {
      const body: SpotifyPlaybackBody = {
        uris: [trackUri],
      };

      if (deviceId) {
        body.device_id = deviceId;
      }

      await axios.put(
        "https://api.spotify.com/v1/me/player/play",
        body,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Failed to start playback:", error);
      throw new Error("Failed to start playback");
    }
  }

  static async pausePlayback(accessToken: string, deviceId?: string): Promise<void> {
    try {
      const body: SpotifyPlaybackBody = {};

      if (deviceId) {
        body.device_id = deviceId;
      }

      await axios.put(
        "https://api.spotify.com/v1/me/player/pause",
        body,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Failed to pause playback:", error);
      throw new Error("Failed to pause playback");
    }
  }

  static async skipToNext(accessToken: string, deviceId?: string): Promise<void> {
    try {
      const body: SpotifyPlaybackBody = {};

      if (deviceId) {
        body.device_id = deviceId;
      }

      await axios.post(
        "https://api.spotify.com/v1/me/player/next",
        body,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Failed to skip to next track:", error);
      throw new Error("Failed to skip to next track");
    }
  }

  static async skipToPrevious(accessToken: string, deviceId?: string): Promise<void> {
    try {
      const body: SpotifyPlaybackBody = {};

      if (deviceId) {
        body.device_id = deviceId;
      }

      await axios.post(
        "https://api.spotify.com/v1/me/player/previous",
        body,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Failed to skip to previous track:", error);
      throw new Error("Failed to skip to previous track");
    }
  }

  static async setVolume(accessToken: string, volumePercent: number, deviceId?: string): Promise<void> {
    try {
      const body: SpotifyPlaybackBody = {
        volume_percent: Math.max(0, Math.min(100, volumePercent)),
      };

      if (deviceId) {
        body.device_id = deviceId;
      }

      await axios.put(
        "https://api.spotify.com/v1/me/player/volume",
        body,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Failed to set volume:", error);
      throw new Error("Failed to set volume");
    }
  }

  static async getCurrentPlayback(accessToken: string): Promise<SpotifyPlaybackState | null> {
    try {
      const response = await axios.get(
        "https://api.spotify.com/v1/me/player",
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 204) {
        return null; // No active playback
      }
      console.error("Failed to get current playback:", error);
      throw new Error("Failed to get current playback");
    }
  }

  static async getAvailableDevices(accessToken: string): Promise<SpotifyDevice[]> {
    try {
      const response = await axios.get(
        "https://api.spotify.com/v1/me/player/devices",
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.devices;
    } catch (error) {
      console.error("Failed to get available devices:", error);
      throw new Error("Failed to get available devices");
    }
  }
}