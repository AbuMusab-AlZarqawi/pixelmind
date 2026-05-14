"use client";

import { useState, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

import Toolbar   from "@/components/Toolbar";
import LiveFeed  from "@/components/LiveFeed";
import ColorPicker from "@/components/ColorPicker";

import { usePixelCanvas, hexToColor } from "@/hooks/usePixelCanvas";
import { useColorPixel, usePixelPrice } from "@/hooks/useColorPixel";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/contract";
import type { ColorPickerState, PixelData } from "@/types";

// Dynamic import for canvas (client-only)
const PixelCanvas = dynamic(() => import("@/components/PixelCanvas"), { ssr: false });

const INITIAL_PICKER: ColorPickerState = {
  open: false, pixelId: 0, x: 0, y: 0, screenX: 0, screenY: 0,
};

export default function Home() {
  const { address } = useAccount();
  const pixelPrice  = usePixelPrice();

  const {
    store, viewState, setViewState,
    liveEvents, isLoading, loadProgress,
    pixelCount, applyLocalPixel, getPixelFromStore,
    zoom, jumpTo, reload,
  } = usePixelCanvas();

  const [picker, setPicker]         = useState<ColorPickerState>(INITIAL_PICKER);
  const [pixelData, setPixelData]   = useState<PixelData | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [selectedColor, setSelectedColor] = useState("#00F5A0");

  const {
    colorPixel, isWritePending, isConfirming, isSuccess, txHash, writeError,
  } = useColorPixel((pixelId, _color) => {
    // Optimistic update already applied, just re-render
    setRenderTick((t) => t + 1);
  });

  // ── Pixel click handler ────────────────────────────────────────────────────
  const handlePixelClick = useCallback(
    (pixelId: number, x: number, y: number, screenX: number, screenY: number) => {
      const data = getPixelFromStore(pixelId);
      setPixelData(data);
      setPicker({ open: true, pixelId, x, y, screenX, screenY });
    },
    [getPixelFromStore]
  );

  // ── Color submit ───────────────────────────────────────────────────────────
  const handleColor = useCallback(
    (pixelId: number, colorHex: string) => {
      if (!pixelPrice || !address) return;
      const colorNum = hexToColor(colorHex);
      // Optimistic local update
      applyLocalPixel(pixelId, colorNum, address);
      setRenderTick((t) => t + 1);
      colorPixel(pixelId, colorHex, pixelPrice);
    },
    [pixelPrice, address, applyLocalPixel, colorPixel]
  );

  // ── Zoom controls ──────────────────────────────────────────────────────────
  const handleZoomIn  = () => zoom( 0.25, window.innerWidth / 2, window.innerHeight / 2);
  const handleZoomOut = () => zoom(-0.25, window.innerWidth / 2, window.innerHeight / 2);
  const handleReset   = () => setViewState({
    scale:   1.5,
    offsetX: -(CANVAS_WIDTH  * 1.5 / 2 - window.innerWidth  / 2),
    offsetY: -(CANVAS_HEIGHT * 1.5 / 2 - window.innerHeight / 2),
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-void">
      {/* Toolbar */}
      <Toolbar
        scale={viewState.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        isLoading={isLoading}
        loadProgress={loadProgress}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <PixelCanvas
            store={store}
            viewState={viewState}
            setViewState={setViewState}
            onPixelClick={handlePixelClick}
            highlightPixelId={picker.open ? picker.pixelId : null}
            renderTick={renderTick}
          />

          {/* Stats overlay */}
          <div className="absolute top-3 left-3 bg-ink/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 pointer-events-none">
            <div className="text-[10px] font-mono text-ghost uppercase tracking-widest mb-0.5">Canvas</div>
            <div className="text-sm font-display text-white">
              {CANVAS_WIDTH} × {CANVAS_HEIGHT}
            </div>
            <div className="text-[10px] font-mono text-neon/70">
              {pixelCount.toLocaleString()} / 500,000 painted
            </div>
          </div>

          {/* Error toast */}
          <AnimatePresence>
            {writeError && (
              <motion.div
                className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-plasma/10 border border-plasma/40 
                  text-plasma text-xs font-mono px-4 py-2 rounded-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: 8 }}
              >
                {(writeError as Error).message?.slice(0, 80) ?? "Transaction failed"}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Live Feed sidebar */}
        <LiveFeed
          events={liveEvents}
          onJumpTo={jumpTo}
          pixelCount={pixelCount}
        />
      </div>

      {/* Color Picker */}
      <ColorPicker
        state={picker}
        pixelData={pixelData}
        pixelPrice={pixelPrice}
        onClose={() => setPicker(INITIAL_PICKER)}
        onColor={handleColor}
        isSubmitting={isWritePending}
        isConfirming={isConfirming}
        isSuccess={isSuccess}
        txHash={txHash}
      />
    </div>
  );
}
