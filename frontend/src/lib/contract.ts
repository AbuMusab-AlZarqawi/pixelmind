// ── Contract address (set via env after deployment) ───────────────────────────
export const PIXELMIND_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

// ── Canvas dimensions (must match contract constants) ─────────────────────────
export const CANVAS_WIDTH  = 1000;
export const CANVAS_HEIGHT = 500;
export const TOTAL_PIXELS  = CANVAS_WIDTH * CANVAS_HEIGHT; // 500,000

// ── ABI ───────────────────────────────────────────────────────────────────────
export const PIXELMIND_ABI = [
  // Read
  {
    name: "pixelPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalRevenue",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getPixel",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "pixelId", type: "uint32" }],
    outputs: [
      { name: "painter",   type: "address" },
      { name: "color",     type: "uint24" },
      { name: "timestamp", type: "uint64" },
    ],
  },
  {
    name: "getPixelsBatch",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "pixelIds", type: "uint32[]" }],
    outputs: [
      { name: "painters",   type: "address[]" },
      { name: "colors",     type: "uint24[]" },
      { name: "timestamps", type: "uint64[]" },
    ],
  },
  // Write
  {
    name: "colorPixel",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "pixelId", type: "uint32" },
      { name: "color",   type: "uint24" },
    ],
    outputs: [],
  },
  {
    name: "colorPixelBatch",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "pixelIds", type: "uint32[]" },
      { name: "colors",   type: "uint24[]" },
    ],
    outputs: [],
  },
  {
    name: "setPixelPrice",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "newPrice", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: "PixelColored",
    type: "event",
    inputs: [
      { name: "pixelId",   type: "uint32",  indexed: true },
      { name: "painter",   type: "address", indexed: true },
      { name: "color",     type: "uint24",  indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;
