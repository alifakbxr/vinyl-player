"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Track {
  id: string;
  title: string;
  artist: string;
  album_cover: string;
  preview_url: string;
}

interface VinylRecordProps {
  track: Track | null;
  isPlaying: boolean;
}

export function VinylRecord({ track, isPlaying }: VinylRecordProps) {
  return (
    <motion.div
      className="w-full h-full rounded-full bg-gradient-to-br from-gray-900 to-black shadow-2xl relative border-4 border-gray-800"
      animate={{ rotate: isPlaying ? 360 : 0 }}
      transition={{
        duration: isPlaying ? 2 : 0,
        repeat: isPlaying ? Infinity : 0,
        ease: "linear"
      }}
    >
      {/* Vinyl grooves effect */}
      <div className="absolute inset-2 rounded-full border border-gray-700 opacity-30"></div>
      <div className="absolute inset-6 rounded-full border border-gray-600 opacity-20"></div>
      <div className="absolute inset-10 rounded-full border border-gray-500 opacity-10"></div>

      {/* Album Art */}
      <div className="absolute inset-4 rounded-full overflow-hidden bg-white shadow-inner">
        {track ? (
          <Image
            src={track.album_cover}
            alt={track.title}
            width={300}
            height={300}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <div className="text-slate-400 text-center">
              <div className="text-6xl mb-2">🎵</div>
              <p className="font-medium">No track selected</p>
              <p className="text-sm mt-1">Search and select a song</p>
            </div>
          </div>
        )}
      </div>

      {/* Record Label */}
      <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-900 rounded-full shadow-lg border border-gray-700"></div>
      <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-800 rounded-full"></div>
    </motion.div>
  );
}