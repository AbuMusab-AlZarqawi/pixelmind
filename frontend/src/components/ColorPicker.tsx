"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { colorToHex } from "@/hooks/usePixelCanvas";
import { CANVAS_WIDTH } from "@/lib/contract";
import type { ColorPickerState, PixelData } from "@/types";

interface Props {
  state:        ColorPickerState;
  pixelData:    PixelData | null;
  pixelPrice:   bigint | undefined;
  onClose:      () => void;
  onColor:      (pixelId: number, color: string) => void;
  isSubmitting: boolean;
  isConfirming: boolean;
  isSuccess:    boolean;
  txHash?:      string;
}

const PALETTE = [
  "#FF006E", "#FF4D00", "#FFB800", "#00F5A0", "#00D4FF",
  "#7C3AED", "#EC4899", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#8B5CF6", "#EF4444", "#3B82F6", "#A855F7",
  "#FFFFFF", "#AAAAAA", "#555555", "#222222", "#000000",
];

function shortAddr(addr: string) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "Uncolored";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ColorPicker({
  state, pixelData, pixelPrice, onClose, onColor, isSubmitting, isConfirming, isSuccess, txHash,
}: Props) {
  const { isConnected } = useAccount();
  const [selectedColor, setSelectedColor] = useState("#00F5A0");
  const inputRef = useRef<HTMLInputElement>(null);

  const col = state.pixelId % CANVAS_WIDTH;
  const row = Math.floor(state.pixelId / CANVAS_WIDTH);

  // Clamp panel position to viewport
  const panelW = 260;
  const panelH = 420;
  const margin = 12;
  const left = Math.min(state.screenX + 12, window.innerWidth  - panelW - margin);
  const top  = Math.min(state.screenY + 12, window.innerHeight - panelH - margin);

  const priceStr = pixelPrice ? formatEther(pixelPrice) : "…";

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(onClose, 1800);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onClose]);

  return (
    <AnimatePresence>
      {state.open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed z-50 w-[260px] bg-ink border border-border rounded-xl shadow-2xl shadow-black/80 overflow-hidden"
            style={{ left, top }}
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={   { opacity: 0, scale: 0.88, y: 4  }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-xs text-ghost font-mono">PIXEL</div>
                <div className="text-sm font-display text-white">
                  ({col}, {row})
                </div>
              </div>
              <div
                className="w-7 h-7 rounded cursor-pointer border border-border"
                style={{ background: colorToHex(pixelData?.color ?? 0xFFFFFF) }}
              />
            </div>

            <div className="p-4 space-y-4">
              {/* Current owner */}
              <div>
                <div className="text-[10px] text-ghost font-mono uppercase tracking-widest mb-1">Owner</div>
                <div className="text-xs text-neon font-mono truncate">
                  {shortAddr(pixelData?.painter ?? "")}
                </div>
              </div>

              {/* Color wheel input */}
              <div>
                <div className="text-[10px] text-ghost font-mono uppercase tracking-widest mb-2">Pick Color</div>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-10 h-10 rounded-lg cursor-pointer border-2 border-border overflow-hidden flex-shrink-0"
                    style={{ background: selectedColor }}
                    onClick={() => inputRef.current?.click()}
                  >
                    <input
                      ref={inputRef}
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={selectedColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setSelectedColor(v);
                      }}
                      className="w-full bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-white uppercase outline-none focus:border-neon/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Palette */}
              <div>
                <div className="text-[10px] text-ghost font-mono uppercase tracking-widest mb-2">Quick Colors</div>
                <div className="grid grid-cols-10 gap-1">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className="w-5 h-5 rounded-sm border border-transparent hover:border-white/40 transition-all hover:scale-110"
                      style={{ background: c, outline: selectedColor === c ? `2px solid ${c}` : "none", outlineOffset: "1px" }}
                    />
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="bg-surface rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] text-ghost font-mono">Cost</span>
                <span className="text-sm text-amber font-mono font-bold">{priceStr} RITUAL</span>
              </div>

              {/* Action */}
              {!isConnected ? (
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              ) : isSuccess ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                  <span className="text-neon text-sm font-mono">Pixel colored!</span>
                </div>
              ) : (
                <button
                  onClick={() => onColor(state.pixelId, selectedColor)}
                  disabled={isSubmitting || isConfirming}
                  className="w-full py-2.5 rounded-lg font-mono text-sm font-bold transition-all disabled:opacity-50
                    bg-neon text-void hover:bg-neon/90 active:scale-95 disabled:cursor-not-allowed
                    shadow-lg shadow-neon/20"
                >
                  {isSubmitting  ? "Confirm in wallet…" :
                   isConfirming  ? "Confirming…"        :
                   "Paint Pixel"}
                </button>
              )}

              {txHash && (
                <a
                  href={`https://explorer.ritualfoundation.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-[10px] text-ghost hover:text-pulse font-mono transition-colors"
                >
                  View tx ↗
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
