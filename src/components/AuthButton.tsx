"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SpotifyAuth } from "@/lib/spotify";
import { LogOut, LogIn } from "lucide-react";

interface AuthButtonProps {
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
}

export function AuthButton({ isAuthenticated, onAuthChange }: AuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = SpotifyAuth.getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Clear cookies by calling logout endpoint
      await fetch("/api/auth/logout", { method: "POST" });
      onAuthChange(false);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <Button
        onClick={handleLogout}
        disabled={isLoading}
        variant="outline"
        className="flex items-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        {isLoading ? "Logging out..." : "Logout"}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
    >
      <LogIn className="w-4 h-4" />
      {isLoading ? "Connecting..." : "Login with Spotify"}
    </Button>
  );
}