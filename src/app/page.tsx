"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Play, Pause, ExternalLink } from "lucide-react";
import { VinylRecord } from "@/components/VinylRecord";
import { Tonearm } from "@/components/Tonearm";
import { AuthButton } from "@/components/AuthButton";

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

  // Utility function to format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

        {/* Search Section */}
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

              {/* Play/Pause Controls */}
              <div className="flex justify-center mt-8 gap-4">
                <Button
                  onClick={handlePlayPause}
                  size="lg"
                  className="rounded-full w-20 h-20 shadow-lg hover:shadow-xl transition-shadow"
                  disabled={!currentTrack}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </Button>

                {/* Play on Spotify button for authenticated users */}
                {isAuthenticated && currentTrack?.spotify_url && (
                  <Button
                    onClick={() => window.open(currentTrack.spotify_url, '_blank')}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-20 h-20 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <ExternalLink className="w-8 h-8" />
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Track Information */}
          <div className="space-y-4">
            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4">Now Playing</h3>
              {currentTrack ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-slate-800">{currentTrack.title}</h4>
                    <p className="text-slate-600">{currentTrack.artist}</p>
                  </div>
                  <div className="text-sm text-slate-500 space-y-2">
                    {useFullTrack ? (
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

            {/* Search Results */}
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
                        track.preview_url ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => track.preview_url && handleTrackSelect(track)}
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
                        {isAuthenticated && track.spotify_url ? (
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
          </div>
        </div>
      </div>
    </div>
  );
}
