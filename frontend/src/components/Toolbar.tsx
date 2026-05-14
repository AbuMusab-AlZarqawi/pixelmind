"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";

interface Props {
  scale:       number;
  onZoomIn:    () => void;
  onZoomOut:   () => void;
  onReset:     () => void;
  isLoading:   boolean;
  loadProgress: number;
}

export default function Toolbar({ scale, onZoomIn, onZoomOut, onReset, isLoading, loadProgress }: Props) {
  return (
    <header className="h-14 bg-ink border-b border-border flex items-center px-4 gap-4 flex-shrink-0 z-30 relative">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded bg-neon/10 border border-neon/30 flex items-center justify-center">
          <div className="w-3 h-3 bg-neon rounded-sm" style={{ clipPath: "polygon(0 0,100% 0,100% 50%,50% 50%,50% 100%,0 100%)" }} />
        </div>
        <span className="font-display text-white text-lg tracking-tight">PixelMind</span>
        <span className="text-[9px] font-mono text-neon/50 border border-neon/20 px-1 rounded uppercase">Ritual</span>
      </div>

      {/* Loading bar */}
      {isLoading && (
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-32 h-1 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-neon rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${loadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] font-mono text-ghost">Loading canvas…</span>
        </motion.div>
      )}

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
        <button
          onClick={onZoomOut}
          className="w-7 h-7 flex items-center justify-center rounded text-ghost hover:text-white hover:bg-muted transition-colors font-mono text-sm"
        >
          −
        </button>
        <button
          onClick={onReset}
          className="px-2 h-7 flex items-center justify-center rounded text-ghost hover:text-white hover:bg-muted transition-colors font-mono text-[11px] min-w-[52px]"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={onZoomIn}
          className="w-7 h-7 flex items-center justify-center rounded text-ghost hover:text-white hover:bg-muted transition-colors font-mono text-sm"
        >
          +
        </button>
      </div>

      {/* Coords hint */}
      <div className="text-[10px] font-mono text-ghost/50 hidden sm:block">
        Scroll to zoom · Drag to pan · Click to paint
      </div>

      {/* Wallet */}
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus="address"
      />
    </header>
  );
}
