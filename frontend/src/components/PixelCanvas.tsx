"use client";

import { useRef, useEffect, useCallback, useState, MouseEvent, WheelEvent, TouchEvent } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/contract";
import { colorToHex } from "@/hooks/usePixelCanvas";
import type { ViewState, ColorPickerState } from "@/types";

interface Props {
  store:            { colors: Uint32Array; owners: string[] };
  viewState:        ViewState;
  setViewState:     (v: ViewState | ((prev: ViewState) => ViewState)) => void;
  onPixelClick:     (pixelId: number, x: number, y: number, screenX: number, screenY: number) => void;
  highlightPixelId: number | null;
  renderTick:       number; // increment to trigger repaint
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 60;

export default function PixelCanvas({
  store, viewState, setViewState, onPixelClick, highlightPixelId, renderTick,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const minimapRef   = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const isDragging   = useRef(false);
  const lastPos      = useRef({ x: 0, y: 0 });
  const pinchDist    = useRef(0);
  const minimapDirty = useRef(true);

  // ── Main canvas render ──────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const { offsetX, offsetY, scale } = viewState;
    const W = canvas.width;
    const H = canvas.height;

    // Clear
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, W, H);

    // Pixel grid bounds visible on screen
    const startCol = Math.max(0, Math.floor(-offsetX / scale));
    const startRow = Math.max(0, Math.floor(-offsetY / scale));
    const endCol   = Math.min(CANVAS_WIDTH,  Math.ceil((W - offsetX) / scale) + 1);
    const endRow   = Math.min(CANVAS_HEIGHT, Math.ceil((H - offsetY) / scale) + 1);

    const pixW = Math.max(1, scale);
    const pixH = Math.max(1, scale);

    // Draw pixels
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const pixelId = row * CANVAS_WIDTH + col;
        const color   = store.colors[pixelId] ?? 0xFFFFFF;

        const r = (color >> 16) & 0xFF;
        const g = (color >> 8)  & 0xFF;
        const b =  color        & 0xFF;

        const sx = offsetX + col * scale;
        const sy = offsetY + row * scale;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(pixW), Math.ceil(pixH));
      }
    }

    // Grid lines (only visible when zoomed in enough)
    if (scale >= 6) {
      ctx.strokeStyle = "rgba(0,245,160,0.12)";
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      for (let col = startCol; col <= endCol; col++) {
        const x = offsetX + col * scale;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let row = startRow; row <= endRow; row++) {
        const y = offsetY + row * scale;
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
    }

    // Highlight selected pixel
    if (highlightPixelId !== null) {
      const hx  = highlightPixelId % CANVAS_WIDTH;
      const hy  = Math.floor(highlightPixelId / CANVAS_WIDTH);
      const sx  = offsetX + hx * scale;
      const sy  = offsetY + hy * scale;
      const now = Date.now() / 400;
      const alpha = 0.5 + 0.5 * Math.sin(now);

      ctx.strokeStyle = `rgba(0,245,160,${alpha})`;
      ctx.lineWidth   = Math.max(1, scale * 0.15);
      ctx.strokeRect(
        Math.floor(sx) + 0.5,
        Math.floor(sy) + 0.5,
        Math.ceil(pixW),
        Math.ceil(pixH)
      );
    }
  }, [viewState, store, highlightPixelId]);

  // ── Minimap render ──────────────────────────────────────────────────────────
  const renderMinimap = useCallback(() => {
    const mm = minimapRef.current;
    if (!mm) return;
    const ctx = mm.getContext("2d", { alpha: false });
    if (!ctx) return;

    const mmW = mm.width;
    const mmH = mm.height;

    // Draw all pixels scaled down
    const imgData = ctx.createImageData(mmW, mmH);
    const data    = imgData.data;

    const scaleX = CANVAS_WIDTH  / mmW;
    const scaleY = CANVAS_HEIGHT / mmH;

    for (let my = 0; my < mmH; my++) {
      for (let mx = 0; mx < mmW; mx++) {
        const col     = Math.floor(mx * scaleX);
        const row     = Math.floor(my * scaleY);
        const pixelId = row * CANVAS_WIDTH + col;
        const color   = store.colors[pixelId] ?? 0xFFFFFF;
        const i       = (my * mmW + mx) * 4;
        data[i]   = (color >> 16) & 0xFF;
        data[i+1] = (color >> 8)  & 0xFF;
        data[i+2] =  color        & 0xFF;
        data[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Viewport indicator
    const canvas = canvasRef.current;
    if (canvas) {
      const { offsetX, offsetY, scale } = viewState;
      const vx = (-offsetX / scale / CANVAS_WIDTH)  * mmW;
      const vy = (-offsetY / scale / CANVAS_HEIGHT) * mmH;
      const vw = (canvas.width  / scale / CANVAS_WIDTH)  * mmW;
      const vh = (canvas.height / scale / CANVAS_HEIGHT) * mmH;

      ctx.strokeStyle = "rgba(0,245,160,0.9)";
      ctx.lineWidth   = 1;
      ctx.strokeRect(
        Math.max(0, vx),
        Math.max(0, vy),
        Math.min(mmW - vx, vw),
        Math.min(mmH - vy, vh)
      );
    }

    minimapDirty.current = false;
  }, [store, viewState]);

  // ── Animation loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    let animHighlight = highlightPixelId !== null;
    let lastMinimap   = 0;

    const loop = (time: number) => {
      render();
      if (minimapDirty.current || time - lastMinimap > 2000) {
        renderMinimap();
        lastMinimap = time;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render, renderMinimap, highlightPixelId]);

  // Re-render on store changes
  useEffect(() => {
    minimapDirty.current = true;
  }, [renderTick]);

  // ── Resize handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ── Mouse events ─────────────────────────────────────────────────────────────
  const screenToPixel = useCallback((screenX: number, screenY: number): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [-1, -1];
    const rect = canvas.getBoundingClientRect();
    const cx   = screenX - rect.left;
    const cy   = screenY - rect.top;
    const col  = Math.floor((cx - viewState.offsetX) / viewState.scale);
    const row  = Math.floor((cy - viewState.offsetY) / viewState.scale);
    return [col, row];
  }, [viewState]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    lastPos.current    = { x: e.clientX, y: e.clientY };
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.buttons !== 1) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setViewState((v) => ({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy }));
  }, [setViewState]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "crosshair";

    if (!isDragging.current) {
      const [col, row] = screenToPixel(e.clientX, e.clientY);
      if (col >= 0 && col < CANVAS_WIDTH && row >= 0 && row < CANVAS_HEIGHT) {
        const pixelId = row * CANVAS_WIDTH + col;
        onPixelClick(pixelId, col, row, e.clientX, e.clientY);
      }
    }
    isDragging.current = false;
  }, [screenToPixel, onPixelClick]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect  = canvas.getBoundingClientRect();
    const cx    = e.clientX - rect.left;
    const cy    = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? -0.12 : 0.12;

    setViewState((v) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * (1 + delta)));
      const ratio    = newScale / v.scale;
      return {
        scale:   newScale,
        offsetX: cx - ratio * (cx - v.offsetX),
        offsetY: cy - ratio * (cy - v.offsetY),
      };
    });
  }, [setViewState]);

  // ── Touch events ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
    } else {
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx      = e.touches[0].clientX - e.touches[1].clientX;
      const dy      = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const delta   = (newDist - pinchDist.current) / pinchDist.current;
      pinchDist.current = newDist;

      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      setViewState((v) => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * (1 + delta)));
        const ratio    = newScale / v.scale;
        return {
          scale:   newScale,
          offsetX: (cx - rect.left) - ratio * ((cx - rect.left) - v.offsetX),
          offsetY: (cy - rect.top)  - ratio * ((cy - rect.top)  - v.offsetY),
        };
      });
    } else {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setViewState((v) => ({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy }));
    }
  }, [setViewState]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging.current && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const [col, row] = screenToPixel(t.clientX, t.clientY);
      if (col >= 0 && col < CANVAS_WIDTH && row >= 0 && row < CANVAS_HEIGHT) {
        const pixelId = row * CANVAS_WIDTH + col;
        onPixelClick(pixelId, col, row, t.clientX, t.clientY);
      }
    }
    isDragging.current = false;
  }, [screenToPixel, onPixelClick]);

  // ── Minimap click to jump ──────────────────────────────────────────────────
  const handleMinimapClick = useCallback((e: MouseEvent) => {
    const mm   = minimapRef.current;
    const main = canvasRef.current;
    if (!mm || !main) return;
    const rect = mm.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) / mm.offsetWidth;
    const my   = (e.clientY - rect.top)  / mm.offsetHeight;
    const col  = Math.floor(mx * CANVAS_WIDTH);
    const row  = Math.floor(my * CANVAS_HEIGHT);

    setViewState((v) => ({
      ...v,
      offsetX: -(col * v.scale - main.width  / 2),
      offsetY: -(row * v.scale - main.height / 2),
    }));
  }, [setViewState]);

  return (
    <div className="relative w-full h-full">
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDragging.current = false; }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Minimap */}
      <div className="absolute bottom-4 right-4 border border-neon/30 rounded overflow-hidden shadow-xl shadow-black/60 group">
        <div className="absolute top-0 left-0 right-0 px-2 py-0.5 bg-black/70 text-[9px] text-neon/60 font-mono uppercase tracking-widest z-10">
          Minimap
        </div>
        <canvas
          ref={minimapRef}
          width={200}
          height={100}
          className="block cursor-pointer opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ imageRendering: "pixelated" }}
          onClick={handleMinimapClick}
        />
      </div>
    </div>
  );
}
