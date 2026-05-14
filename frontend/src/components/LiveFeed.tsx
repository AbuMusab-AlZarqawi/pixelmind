"use client";

import { motion, AnimatePresence } from "framer-motion";
import { colorToHex } from "@/hooks/usePixelCanvas";
import { CANVAS_WIDTH } from "@/lib/contract";
import type { PixelEvent } from "@/types";

interface Props {
  events:     PixelEvent[];
  onJumpTo:   (x: number, y: number) => void;
  pixelCount: number;
}

function shortAddr(addr: string) {
  if (!addr) return "???";
  return `${addr.slice(0, 5)}…${addr.slice(-3)}`;
}

function relativeTime(ts: number): string {
  if (!ts) return "now";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 5)   return "just now";
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function LiveFeed({ events, onJumpTo, pixelCount }: Props) {
  return (
    <aside className="flex flex-col h-full bg-ink border-l border-border w-64 flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
          <span className="text-[10px] font-mono text-ghost uppercase tracking-widest">Live Feed</span>
        </div>
        <div className="text-lg font-display text-white">
          {pixelCount.toLocaleString()}
          <span className="text-sm text-ghost font-mono ml-1">painted</span>
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <div className="text-center text-ghost text-xs font-mono py-8 opacity-50">
              No activity yet
            </div>
          ) : (
            events.map((ev) => (
              <motion.button
                key={ev.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{    opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onClick={() => onJumpTo(ev.x, ev.y)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface
                  transition-colors group text-left"
              >
                {/* Color swatch */}
                <div
                  className="w-5 h-5 rounded-sm flex-shrink-0 border border-white/10"
                  style={{ background: colorToHex(ev.color) }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-white/80 truncate">
                    {shortAddr(ev.painter)}
                  </div>
                  <div className="text-[10px] font-mono text-ghost">
                    ({ev.x}, {ev.y}) · {relativeTime(ev.timestamp)}
                  </div>
                </div>

                {/* Jump arrow */}
                <div className="text-ghost/0 group-hover:text-neon/60 transition-colors text-xs">↗</div>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="text-[10px] font-mono text-ghost/50 leading-relaxed">
          Click any event to<br />jump to that pixel.
        </div>
      </div>
    </aside>
  );
}
