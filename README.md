# PixelMind 🎨

**Collaborative Onchain Pixel Canvas on Ritual Chain**

A 1000×500 (500,000 pixel) canvas where anyone can paint any pixel by paying 0.001 RITUAL. Every pixel color and owner is stored permanently on Ritual Chain Testnet. Over time it becomes a giant collaborative art piece.

---

## Architecture

```
pixelmind/
├── contracts/
│   └── PixelMind.sol          ← Solidity contract (sparse pixel storage)
├── scripts/
│   └── deploy.ts              ← Hardhat deployment script
├── hardhat.config.ts
├── package.json
└── frontend/
    ├── src/
    │   ├── app/               ← Next.js 14 App Router
    │   ├── components/        ← PixelCanvas, ColorPicker, LiveFeed, Toolbar
    │   ├── hooks/             ← usePixelCanvas, useColorPixel
    │   ├── lib/               ← contract ABI, wagmi config
    │   └── types/             ← TypeScript types
    └── package.json
```

### Key design decisions

- **Sparse contract storage**: pixels only exist in contract storage when colored. Uncolored pixels default to white (0xFFFFFF). This makes the contract cheap to deploy and use.
- **HTML5 Canvas API**: all 500,000 pixels rendered in a single `<canvas>` element — no DOM divs, no React re-renders per pixel.
- **Event-driven loading**: instead of reading 500k storage slots, the frontend fetches all `PixelColored` events to reconstruct the current canvas state. Only colored pixels are ever fetched.
- **In-memory Uint32Array**: pixel colors stored in a typed array for maximum render performance.
- **Optimistic UI**: your pixel color appears instantly on click; the transaction confirms in the background.

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- MetaMask with Ritual Chain Testnet added:
  - RPC URL: `https://rpc.ritualfoundation.org`
  - Chain ID: `1979`
  - Currency: `RITUAL`
- Testnet RITUAL tokens in your wallet
- A WalletConnect project ID (free at https://cloud.walletconnect.com)

---

## Step 1 — Install contract dependencies

```powershell
# In the project root (pixelmind/)
npm install
```

---

## Step 2 — Configure environment (contracts)

```powershell
# Copy the example
Copy-Item .env.example .env

# Edit .env and fill in your MetaMask private key:
# PRIVATE_KEY=your_private_key_without_0x_prefix
notepad .env
```

⚠️ **Never commit `.env` to git** — it's in `.gitignore`.

---

## Step 3 — Compile the contract

```powershell
npm run compile
```

You should see: `Compiled 1 Solidity file successfully`

---

## Step 4 — Deploy to Ritual Chain Testnet

```powershell
npm run deploy
```

The script will print your contract address. Copy it — you need it for Step 6.

Example output:
```
✓ PixelMind deployed at: 0xAbCd...1234
  Canvas size: 1000 × 500 = 500,000 pixels

NEXT_PUBLIC_CONTRACT_ADDRESS=0xAbCd...1234
```

The deployment info is also saved to `deployments/ritual-testnet.json`.

---

## Step 5 — Install frontend dependencies

```powershell
cd frontend
npm install
```

---

## Step 6 — Configure frontend environment

```powershell
# Still inside frontend/
Copy-Item .env.example .env.local

# Edit .env.local:
notepad .env.local
```

Fill in:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress   ← from Step 4
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id ← from cloud.walletconnect.com
```

---

## Step 7 — Run locally

```powershell
npm run dev
```

Open http://localhost:3000

---

## Step 8 — Deploy to Vercel

### Via GitHub (recommended)

1. Push to GitHub:
   ```powershell
   cd ..  # back to project root
   git init
   git add .
   git commit -m "Initial PixelMind commit"
   git remote add origin https://github.com/YOUR_USERNAME/pixelmind.git
   git push -u origin main
   ```

2. Go to https://vercel.com → New Project → Import your repo

3. **Important**: Set **Root Directory** to `frontend`

4. Add Environment Variables in Vercel dashboard:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` = your contract address
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` = your WalletConnect ID

5. Deploy!

---

## Using the dApp

| Action | How |
|--------|-----|
| **Zoom in/out** | Mouse wheel, or +/− buttons in toolbar |
| **Pan** | Click and drag |
| **Paint a pixel** | Click any pixel → pick color → click "Paint Pixel" |
| **Navigate to a pixel** | Click any event in the Live Feed sidebar |
| **Jump on minimap** | Click anywhere on the minimap (bottom-right) |
| **Reset view** | Click the zoom % button in toolbar |

---

## Contract Functions

### User-facing
| Function | Description |
|----------|-------------|
| `colorPixel(pixelId, color)` | Paint one pixel, payable |
| `colorPixelBatch(pixelIds[], colors[])` | Paint up to 100 pixels at once |
| `getPixel(pixelId)` | Read a pixel's color + owner |
| `getPixelsBatch(pixelIds[])` | Batch read pixels |

### Owner-only
| Function | Description |
|----------|-------------|
| `setPixelPrice(newPrice)` | Change the price per pixel |
| `withdraw()` | Withdraw all RITUAL to owner |
| `withdrawTo(address)` | Withdraw to specific address |
| `transferOwnership(address)` | Transfer contract ownership |

---

## Contract Details

- **Canvas**: 1000 × 500 = 500,000 pixels
- **Pixel ID**: `row * 1000 + col` (0 to 499,999)
- **Color format**: uint24 packed RGB (0xRRGGBB)
- **Default color**: 0xFFFFFF (white) for uncolored pixels
- **Default price**: 0.001 RITUAL per pixel
- **Max batch size**: 100 pixels per transaction

---

## Troubleshooting

**"Cannot connect to network"**
→ Make sure MetaMask has Ritual Chain added with RPC `https://rpc.ritualfoundation.org` and Chain ID `1979`.

**"Insufficient funds"**
→ You need RITUAL testnet tokens. Get them from the Ritual faucet.

**Canvas appears empty**
→ The contract may not be deployed yet, or `NEXT_PUBLIC_CONTRACT_ADDRESS` is wrong.

**Vercel build fails**
→ Make sure Root Directory is set to `frontend`, not the project root.

**PowerShell execution policy error**
→ Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
