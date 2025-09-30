"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Play, Pause, ExternalLink, SkipBack, SkipForward, Volume2, User, Music, Clock, Heart } from "lucide-react";
import { VinylRecord } from "@/components/VinylRecord";
import { Tonearm } from "@/components/Tonearm";
import { AuthButton } from "@/components/AuthButton";
import { SpotifyPlaybackState, SpotifyDevice } from "@/lib/spotify";

interface Track {
  id: string;
  title: string;
  artist: string;
  album_cover: string;
  preview_url: string;
  spotify_uri?: string;
  spotify_url?: string;
  duration_ms?: number;
  is_full_track_available?: boolean;
  album?: {
    name: string;
    images: Array<{ url: string }>;
  };
  artists?: Array<{ name: string }>;
}

interface Playlist {
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

interface User {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  country: string;
}

interface PlaybackControlBody {
  action: string;
  trackUri?: string;
  deviceId?: string;
  volumePercent?: number;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [useFullTrack, setUseFullTrack] = useState(false);

  // New state for enhanced features
  const [user, setUser] = useState<User | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [savedTracks, setSavedTracks] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [currentPlayback, setCurrentPlayback] = useState<SpotifyPlaybackState | null>(null);
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'playlists' | 'saved' | 'recent'>('search');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [volume, setVolume] = useState(50);
  const [isUserDataLoading, setIsUserDataLoading] = useState(false);
  const [isPlaybackLoading, setIsPlaybackLoading] = useState(false);

  // Utility function to format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch user data and playlists when authenticated
  const fetchUserData = async () => {
    if (!isAuthenticated) return;

    setIsUserDataLoading(true);
    try {
      const response = await fetch('/api/user');
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setSavedTracks(data.savedTracks || []);
        setRecentlyPlayed(data.recentlyPlayed || []);
      } else {
        console.error('Failed to fetch user data:', data.error);
      }
    } catch (error) {
      console.error('User data fetch error:', error);
    } finally {
      setIsUserDataLoading(false);
    }
  };

  // Fetch user playlists
  const fetchPlaylists = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/playlists');
      const data = await response.json();

      if (response.ok) {
        setPlaylists(data.playlists || []);
      } else {
        console.error('Failed to fetch playlists:', data.error);
      }
    } catch (error) {
      console.error('Playlists fetch error:', error);
    }
  };

  // Fetch current playback state
  const fetchPlaybackState = async () => {
    if (!isAuthenticated) return;

    setIsPlaybackLoading(true);
    try {
      const response = await fetch('/api/playback');
      const data = await response.json();

      if (response.ok) {
        setCurrentPlayback(data.playback);
        setAvailableDevices(data.devices || []);
        setIsPlaying(data.playback?.is_playing || false);

        // Update current track if playback state has one
        if (data.playback?.item && !currentTrack) {
          const track = data.playback.item;
          setCurrentTrack({
            id: track.id,
            title: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            album_cover: track.album?.images[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image',
            preview_url: track.preview_url,
            spotify_uri: track.uri,
            spotify_url: track.external_urls?.spotify,
            duration_ms: track.duration_ms,
            album: track.album,
            artists: track.artists,
          });
        }
      } else {
        console.error('Failed to fetch playback state:', data.error);
      }
    } catch (error) {
      console.error('Playback state fetch error:', error);
    } finally {
      setIsPlaybackLoading(false);
    }
  };

  // Control playback
  const controlPlayback = async (action: string, trackUri?: string, deviceId?: string) => {
    if (!isAuthenticated) return;

    try {
      const body: PlaybackControlBody = { action };
      if (trackUri) body.trackUri = trackUri;
      if (deviceId) body.deviceId = deviceId;

      const response = await fetch('/api/playback', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh playback state after control action
        setTimeout(fetchPlaybackState, 500);
      } else {
        console.error('Playback control failed:', data.error);
        alert(data.error || 'Playback control failed');
      }
    } catch (error) {
      console.error('Playback control error:', error);
      alert('Playback control failed. Please try again.');
    }
  };

  // Handle track selection with Spotify playback
  const handleTrackSelectWithSpotify = async (track: Track) => {
    setCurrentTrack(track);

    if (isAuthenticated && track.spotify_uri) {
      // Try to play on Spotify
      try {
        await controlPlayback('play', track.spotify_uri);
      } catch (error) {
        console.error('Failed to play on Spotify:', error);
        // Fall back to preview playback
        handleTrackSelect(track);
      }
    } else {
      // Use preview playback for non-authenticated users or tracks without URI
      handleTrackSelect(track);
    }
  };

  // Set volume
  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    if (isAuthenticated) {
      await controlPlayback('volume', undefined, undefined);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status");
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.authenticated);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Fetch user data and playlists when authenticated
  useEffect(() => {
    if (isAuthenticated && authChecked) {
      fetchUserData();
      fetchPlaylists();
      fetchPlaybackState();

      // Set up periodic playback state updates
      const interval = setInterval(fetchPlaybackState, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, authChecked]);

  // Check if Spotify API is configured
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch("/api/search?q=test");
        if (response.status === 503) {
          const data = await response.json();
          console.warn("Spotify API configuration issue:", data.error);
        }
      } catch (error) {
        // Ignore errors during config check
      }
    };

    // Small delay to avoid interfering with auth check
    setTimeout(checkConfig, 1000);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.tracks || []);
      } else {
        console.error("Search failed:", data.error);
        setSearchResults([]);

        // Show user-friendly error messages for specific cases
        if (response.status === 401) {
          alert("Authentication expired. Please log out and log back in with Spotify.");
        } else if (response.status === 503) {
          alert("Spotify API is not configured. Please check your environment variables.");
        } else if (response.status >= 500) {
          alert("Server error. Please try again in a moment.");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Determine if we should use full track or preview
    const shouldUseFullTrack = isAuthenticated && (track.is_full_track_available !== false) && !!track.spotify_url;
    setUseFullTrack(shouldUseFullTrack);

    if (audio) {
      audio.pause();
      audio.removeEventListener("ended", () => setIsPlaying(false));
      audio.removeEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
      audio.removeEventListener("loadedmetadata", () => setDuration(audio.duration));
      audio.removeEventListener("error", handleAudioError);
      audio.src = "";
      setAudio(null);
    }
  };

  const handleAudioError = (e?: Event) => {
    console.error("Audio playback failed:", e);
    setIsPlaying(false);

    if (audio) {
      audio.pause();
      audio.removeEventListener("ended", () => setIsPlaying(false));
      audio.removeEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
      audio.removeEventListener("loadedmetadata", () => setDuration(audio.duration));
      audio.removeEventListener("error", handleAudioError);
      audio.src = "";
      setAudio(null);
    }

    // Provide specific error messages based on the situation
    if (isAuthenticated && currentTrack?.spotify_url) {
      alert("Preview not available. Click 'Play on Spotify' to listen to the full track.");
    } else if (currentTrack?.preview_url) {
      alert("Audio format not supported. Please try another track.");
    } else {
      alert("This track doesn't have a preview available.");
    }
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;

    // If user is authenticated and full track is available, open in Spotify
    if (useFullTrack && currentTrack.spotify_url) {
      window.open(currentTrack.spotify_url, '_blank');
      return;
    }

    // Otherwise, use preview playback
    if (!currentTrack.preview_url) {
      if (isAuthenticated && currentTrack.spotify_url) {
        const shouldOpenSpotify = confirm("Preview not available. Would you like to open this track in Spotify?");
        if (shouldOpenSpotify) {
          window.open(currentTrack.spotify_url, '_blank');
        }
      } else {
        alert("This track doesn't have a preview available.");
      }
      return;
    }

    if (isPlaying) {
      audio?.pause();
      setIsPlaying(false);
    } else {
      if (audio) {
        audio.play().catch(() => {
          console.error("Audio playback failed");
          handleAudioError();
        });
        setIsPlaying(true);
      } else {
        const newAudio = new Audio(currentTrack.preview_url);

        // Add event listeners before attempting to play
        newAudio.addEventListener("ended", () => setIsPlaying(false));
        newAudio.addEventListener("timeupdate", () => setCurrentTime(newAudio.currentTime));
        newAudio.addEventListener("loadedmetadata", () => setDuration(newAudio.duration));
        newAudio.addEventListener("error", handleAudioError);

        // Validate the audio source before playing
        newAudio.addEventListener("loadeddata", () => {
          if (newAudio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            newAudio.play().catch((error) => {
              console.error("Audio playback failed:", error);
              handleAudioError();
            });
            setIsPlaying(true);
          } else {
            console.warn("Audio data not ready");
            handleAudioError();
          }
        });

        // Handle case where audio fails to load
        newAudio.addEventListener("abort", () => {
          console.warn("Audio loading aborted");
          handleAudioError();
        });

        newAudio.load(); // Explicitly load the audio
        setAudio(newAudio);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center py-8">
          <div className="flex justify-between items-start mb-4">
            <div></div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">
                Virtual Vinyl Player
              </h1>
              <p className="text-slate-600">
                Search and play your favorite tracks on a virtual vinyl record
              </p>
            </div>
            <div className="flex items-center gap-4">
              {authChecked && isAuthenticated && user && (
                <div className="flex items-center gap-3">
                  <img
                    src={user.images[0]?.url || 'https://via.placeholder.com/32x32?text=U'}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-800">{user.display_name}</div>
                    <div className="text-xs text-slate-600">Spotify Premium</div>
                  </div>
                </div>
              )}
              {authChecked && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-slate-600">
                    {isAuthenticated ? 'Spotify Connected' : 'Guest Mode'}
                  </span>
                </div>
              )}
              <AuthButton
                isAuthenticated={isAuthenticated}
                onAuthChange={setIsAuthenticated}
              />
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        {isAuthenticated && (
          <div className="flex justify-center mb-8">
            <div className="flex bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-lg">
              {[
                { key: 'search', label: 'Search', icon: Search },
                { key: 'playlists', label: 'Playlists', icon: Music },
                { key: 'saved', label: 'Liked Songs', icon: Heart },
                { key: 'recent', label: 'Recently Played', icon: Clock },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as 'search' | 'playlists' | 'saved' | 'recent')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Section */}
        {activeTab === 'search' && (
          <div className="flex gap-4 mb-8 max-w-2xl mx-auto">
            <Input
              type="text"
              placeholder="Search for songs, artists, or albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-lg py-3"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} className="px-8 py-3 text-lg" disabled={isLoading}>
              <Search className="w-5 h-5 mr-2" />
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Vinyl Player */}
          <div className="lg:col-span-2 flex justify-center">
            <Card className="p-8 bg-white/90 backdrop-blur-sm shadow-xl border-0">
              <div className="relative w-80 h-80 sm:w-96 sm:h-96 mx-auto">
                {/* Vinyl Record */}
                <div className="w-full h-full rounded-full bg-black shadow-2xl relative">
                  <VinylRecord track={currentTrack} isPlaying={isPlaying} />
                </div>

                {/* Tonearm */}
                <Tonearm isPlaying={isPlaying} />
              </div>

              {/* Enhanced Playback Controls */}
              <div className="mt-8 space-y-4">
                {/* Progress Bar for Spotify playback */}
                {isAuthenticated && currentPlayback && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>{formatTime((currentPlayback.progress_ms || 0) / 1000)}</span>
                      <span>{currentTrack ? formatTime((currentTrack.duration_ms || 0) / 1000) : '0:00'}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-slate-600 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: currentTrack?.duration_ms
                            ? `${((currentPlayback.progress_ms || 0) / currentTrack.duration_ms) * 100}%`
                            : '0%'
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-4">
                  {/* Previous Track */}
                  <Button
                    onClick={() => controlPlayback('previous')}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-12 h-12 p-0"
                    disabled={!isAuthenticated || isPlaybackLoading}
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>

                  {/* Play/Pause */}
                  <Button
                    onClick={() => {
                      if (isAuthenticated && currentTrack?.spotify_uri) {
                        controlPlayback(isPlaying ? 'pause' : 'play', currentTrack.spotify_uri);
                      } else {
                        handlePlayPause();
                      }
                    }}
                    size="lg"
                    className="rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-shadow"
                    disabled={!currentTrack}
                  >
                    {isPlaybackLoading ? (
                      <div className="w-8 h-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </Button>

                  {/* Next Track */}
                  <Button
                    onClick={() => controlPlayback('next')}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-12 h-12 p-0"
                    disabled={!isAuthenticated || isPlaybackLoading}
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>

                {/* Volume Control for Spotify */}
                {isAuthenticated && (
                  <div className="flex items-center justify-center gap-3">
                    <Volume2 className="w-4 h-4 text-slate-600" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-sm text-slate-600 w-8">{volume}%</span>
                  </div>
                )}

                {/* Play on Spotify button for non-premium tracks */}
                {currentTrack?.spotify_url && !isAuthenticated && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() => window.open(currentTrack.spotify_url, '_blank')}
                      size="lg"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Play on Spotify
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar Content */}
          <div className="space-y-4">
            {/* Now Playing */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4">Now Playing</h3>
              {currentTrack ? (
                <div className="space-y-3">
                  <img
                    src={currentTrack.album_cover}
                    alt={currentTrack.title}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div>
                    <h4 className="font-medium text-slate-800 truncate">{currentTrack.title}</h4>
                    <p className="text-slate-600 truncate">{currentTrack.artist}</p>
                    {currentTrack.album && (
                      <p className="text-sm text-slate-500 truncate">{currentTrack.album.name}</p>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 space-y-2">
                    {isAuthenticated && currentTrack.spotify_uri ? (
                      <p className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Playing on Spotify
                      </p>
                    ) : useFullTrack ? (
                      <p>Full track available on Spotify</p>
                    ) : (
                      <>
                        <p>Duration: {currentTrack.duration_ms ? formatTime(currentTrack.duration_ms / 1000) : '30s preview'}</p>
                        {duration > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1">
                              <div
                                className="bg-slate-600 h-1 rounded-full transition-all duration-100"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <p>Status: {isPlaying ? "Playing" : "Paused"}</p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-center py-8">
                  <p>Search and select a track to start playing</p>
                </div>
              )}
            </Card>

            {/* Tab Content */}
            {activeTab === 'search' && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4">Search Results</h3>
                {isLoading ? (
                  <div className="text-slate-400 text-center py-8">
                    <p>Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {searchResults.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
                          (track.preview_url || (isAuthenticated && track.spotify_uri)) ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (track.preview_url || (isAuthenticated && track.spotify_uri)) {
                            handleTrackSelectWithSpotify(track);
                          }
                        }}
                      >
                        <img
                          src={track.album_cover}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== "https://via.placeholder.com/300x300?text=No+Image") {
                              target.src = "https://via.placeholder.com/300x300?text=No+Image";
                            }
                          }}
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{track.title}</h4>
                          <p className="text-xs text-slate-600 truncate">{track.artist}</p>
                          {isAuthenticated && track.spotify_uri ? (
                            <p className="text-xs text-green-600">Full track available</p>
                          ) : !track.preview_url ? (
                            <p className="text-xs text-orange-600">No preview available</p>
                          ) : (
                            <p className="text-xs text-blue-600">Preview available</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-slate-400 text-center py-8">
                    <p>No tracks found for &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">
                    <p>Search for tracks to see results here</p>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'playlists' && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4">Your Playlists</h3>
                {isUserDataLoading ? (
                  <div className="text-slate-400 text-center py-8">
                    <p>Loading playlists...</p>
                  </div>
                ) : playlists.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedPlaylist(playlist);
                          // TODO: Fetch playlist tracks
                        }}
                      >
                        <img
                          src={playlist.images[0]?.url || 'https://via.placeholder.com/64x64?text=P'}
                          alt={playlist.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{playlist.name}</h4>
                          <p className="text-xs text-slate-600 truncate">{playlist.tracks.total} tracks</p>
                          <p className="text-xs text-slate-500 truncate">By {playlist.owner.display_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">
                    <p>No playlists found</p>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'saved' && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4">Liked Songs</h3>
                {isUserDataLoading ? (
                  <div className="text-slate-400 text-center py-8">
                    <p>Loading liked songs...</p>
                  </div>
                ) : savedTracks.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {savedTracks.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
                          (track.preview_url || (isAuthenticated && track.spotify_uri)) ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (track.preview_url || (isAuthenticated && track.spotify_uri)) {
                            handleTrackSelectWithSpotify(track);
                          }
                        }}
                      >
                        <img
                          src={track.album_cover}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== "https://via.placeholder.com/300x300?text=No+Image") {
                              target.src = "https://via.placeholder.com/300x300?text=No+Image";
                            }
                          }}
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{track.title}</h4>
                          <p className="text-xs text-slate-600 truncate">{track.artist}</p>
                          <p className="text-xs text-green-600">Liked song</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">
                    <p>No liked songs found</p>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'recent' && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4">Recently Played</h3>
                {isUserDataLoading ? (
                  <div className="text-slate-400 text-center py-8">
                    <p>Loading recently played...</p>
                  </div>
                ) : recentlyPlayed.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recentlyPlayed.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
                          (track.preview_url || (isAuthenticated && track.spotify_uri)) ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (track.preview_url || (isAuthenticated && track.spotify_uri)) {
                            handleTrackSelectWithSpotify(track);
                          }
                        }}
                      >
                        <img
                          src={track.album_cover}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== "https://via.placeholder.com/300x300?text=No+Image") {
                              target.src = "https://via.placeholder.com/300x300?text=No+Image";
                            }
                          }}
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{track.title}</h4>
                          <p className="text-xs text-slate-600 truncate">{track.artist}</p>
                          <p className="text-xs text-purple-600">Recently played</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">
                    <p>No recently played tracks</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
