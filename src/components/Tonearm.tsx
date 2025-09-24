"use client";

import { motion } from "framer-motion";

interface TonearmProps {
  isPlaying: boolean;
}

export function Tonearm({ isPlaying }: TonearmProps) {
  return (
    <motion.div
      className="absolute top-8 right-8 w-32 h-2 bg-gradient-to-r from-slate-600 to-slate-800 origin-left shadow-lg rounded-full"
      animate={{
        rotate: isPlaying ? -15 : 45,
        x: isPlaying ? -20 : 0
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="absolute right-0 w-3 h-3 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full shadow-md border border-slate-600"></div>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 bg-slate-400 rounded-full opacity-60"></div>
    </motion.div>
  );
}