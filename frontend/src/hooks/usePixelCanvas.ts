"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { PIXELMIND_ABI, PIXELMIND_ADDRESS, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/contract";
import type { PixelData, ViewState, PixelEvent } from "@/types";

const PIXEL_LOAD_CHUNK  = 500;  // pixels fetched per RPC batch call
const MAX_LIVE_EVENTS   = 50;   // max items in the live feed

// ── In-memory pixel store (Uint32Array for perf) ──────────────────────────────
// Each element: color as 0xAARRGGBB where AA=FF means colored, AA=00 means default
let globalPixelColors: Uint32Array | null = null;
let globalPixelOwners: string[]   | null = null;

function getOrCreateStore() {
  if (!globalPixelColors) {
    globalPixelColors = new Uint32Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill(0xFFFFFFFF);
    globalPixelOwners = new Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill("");
  }
  return { colors: globalPixelColors, owners: globalPixelOwners! };
}

// Convert uint24 RGB to CSS hex string
export function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

// Convert hex string to uint24
export function hexToColor(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export function usePixelCanvas() {
  const publicClient = usePublicClient();

  const [viewState, setViewState] = useState<ViewState>({
    offsetX: 0,
    offsetY: 0,
    scale:   1.5,
  });

  const [liveEvents, setLiveEvents]   = useState<PixelEvent[]>([]);
  const [isLoading,  setIsLoading]    = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [pixelCount, setPixelCount]   = useState(0); // number of colored pixels loaded

  const store = getOrCreateStore();

  // ── Load colored pixels from chain ──────────────────────────────────────────
  // Strategy: we can't enumerate all 500k pixels cheaply.
  // Instead we poll for PixelColored events to find which pixels are set,
  // then batch-fetch their current state.
  const loadPixelsFromEvents = useCallback(async () => {
    if (!publicClient) return;
    setIsLoading(true);
    setLoadProgress(0);

    try {
      // Fetch all PixelColored events from block 0
      const logs = await publicClient.getLogs({
        address: PIXELMIND_ADDRESS,
        event: {
          type: "event",
          name: "PixelColored",
          inputs: [
            { name: "pixelId",   type: "uint32",  indexed: true },
            { name: "painter",   type: "address", indexed: true },
            { name: "color",     type: "uint24",  indexed: false },
            { name: "timestamp", type: "uint256", indexed: false },
          ],
        },
        fromBlock: 0n,
        toBlock: "latest",
      });

      // Deduplicate: keep only the last paint per pixel
      const latestByPixel = new Map<number, { painter: string; color: number; timestamp: number }>();
      for (const log of logs) {
        const args = log.args as { pixelId?: number; painter?: string; color?: number; timestamp?: bigint };
        if (args.pixelId === undefined) continue;
        latestByPixel.set(Number(args.pixelId), {
          painter:   args.painter  || "",
          color:     Number(args.color) || 0xFFFFFF,
          timestamp: Number(args.timestamp || 0n),
        });
      }

      // Apply to store
      let count = 0;
      for (const [pixelId, data] of latestByPixel) {
        store.colors[pixelId] = data.color;
        store.owners[pixelId] = data.painter;
        count++;
      }

      setPixelCount(count);
      setLoadProgress(100);

      // Build recent events for live feed (last 50)
      const recentEvents: PixelEvent[] = [];
      let idx = 0;
      for (const log of logs.slice(-MAX_LIVE_EVENTS)) {
        const args = log.args as { pixelId?: number; painter?: string; color?: number; timestamp?: bigint };
        if (args.pixelId === undefined) continue;
        const pid = Number(args.pixelId);
        recentEvents.push({
          id:        idx++,
          pixelId:   pid,
          painter:   args.painter || "",
          color:     Number(args.color) || 0xFFFFFF,
          timestamp: Number(args.timestamp || 0n),
          x:         pid % CANVAS_WIDTH,
          y:         Math.floor(pid / CANVAS_WIDTH),
        });
      }
      setLiveEvents(recentEvents.reverse());

    } catch (err) {
      console.error("Failed to load pixels:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, store]);

  // Load on mount
  useEffect(() => {
    loadPixelsFromEvents();
  }, [loadPixelsFromEvents]);

  // ── Watch for new PixelColored events ────────────────────────────────────────
  useEffect(() => {
    if (!publicClient) return;

    const unwatch = publicClient.watchEvent({
      address: PIXELMIND_ADDRESS,
      event: {
        type: "event",
        name: "PixelColored",
        inputs: [
          { name: "pixelId",   type: "uint32",  indexed: true },
          { name: "painter",   type: "address", indexed: true },
          { name: "color",     type: "uint24",  indexed: false },
          { name: "timestamp", type: "uint256", indexed: false },
        ],
      },
      onLogs: (logs) => {
        for (const log of logs) {
          const args = log.args as { pixelId?: number; painter?: string; color?: number; timestamp?: bigint };
          if (args.pixelId === undefined) continue;

          const pid   = Number(args.pixelId);
          const color = Number(args.color) || 0xFFFFFF;

          // Update store
          store.colors[pid] = color;
          store.owners[pid] = args.painter || "";

          // Push to live feed
          const newEvent: PixelEvent = {
            id:        Date.now(),
            pixelId:   pid,
            painter:   args.painter || "",
            color,
            timestamp: Number(args.timestamp || 0n),
            x:         pid % CANVAS_WIDTH,
            y:         Math.floor(pid / CANVAS_WIDTH),
          };

          setLiveEvents((prev) => [newEvent, ...prev].slice(0, MAX_LIVE_EVENTS));
          setPixelCount((c) => c + 1);
        }
      },
    });

    return () => { unwatch(); };
  }, [publicClient, store]);

  // ── Local optimistic update (after tx) ──────────────────────────────────────
  const applyLocalPixel = useCallback((pixelId: number, color: number, painter: string) => {
    store.colors[pixelId] = color;
    store.owners[pixelId] = painter;
    setPixelCount((c) => c + 1);
  }, [store]);

  // ── Get pixel data from store ────────────────────────────────────────────────
  const getPixelFromStore = useCallback((pixelId: number): PixelData => {
    return {
      id:        pixelId,
      color:     store.colors[pixelId] ?? 0xFFFFFF,
      painter:   store.owners[pixelId] ?? "",
      timestamp: 0,
    };
  }, [store]);

  // ── View / pan / zoom helpers ────────────────────────────────────────────────
  const pan = useCallback((dx: number, dy: number) => {
    setViewState((v) => ({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy }));
  }, []);

  const zoom = useCallback((delta: number, cx: number, cy: number) => {
    setViewState((v) => {
      const newScale = Math.min(40, Math.max(0.3, v.scale * (1 + delta)));
      // Zoom toward cursor
      const ratio   = newScale / v.scale;
      const offsetX = cx - ratio * (cx - v.offsetX);
      const offsetY = cy - ratio * (cy - v.offsetY);
      return { scale: newScale, offsetX, offsetY };
    });
  }, []);

  const jumpTo = useCallback((x: number, y: number) => {
    setViewState((v) => ({
      ...v,
      offsetX: -(x * v.scale - window.innerWidth  / 2),
      offsetY: -(y * v.scale - window.innerHeight / 2),
    }));
  }, []);

  return {
    store,
    viewState,
    setViewState,
    liveEvents,
    isLoading,
    loadProgress,
    pixelCount,
    applyLocalPixel,
    getPixelFromStore,
    pan,
    zoom,
    jumpTo,
    reload: loadPixelsFromEvents,
  };
}
