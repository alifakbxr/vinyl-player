"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Play, Pause } from "lucide-react";
import { VinylRecord } from "@/components/VinylRecord";
import { Tonearm } from "@/components/Tonearm";
import { AuthButton } from "@/components/AuthButton";

interface Track {
  id: string;
  title: string;
  artist: string;
  album_cover: string;
  preview_url: string;
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
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    if (audio) {
      audio.pause();
      setAudio(null);
    }
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;

    if (isPlaying) {
      audio?.pause();
      setIsPlaying(false);
    } else {
      if (audio) {
        audio.play();
        setIsPlaying(true);
      } else {
        const newAudio = new Audio(currentTrack.preview_url);
        newAudio.addEventListener("ended", () => setIsPlaying(false));
        newAudio.play();
        setAudio(newAudio);
        setIsPlaying(true);
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
              <div className="flex justify-center mt-8">
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
                  <div className="text-sm text-slate-500">
                    <p>Duration: 30s preview</p>
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
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleTrackSelect(track)}
                    >
                      <img
                        src={track.album_cover}
                        alt={track.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{track.title}</h4>
                        <p className="text-xs text-slate-600 truncate">{track.artist}</p>
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
