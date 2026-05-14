import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("─────────────────────────────────────────");
  console.log("  PixelMind — Deployment Script");
  console.log("  Ritual Chain Testnet (Chain ID: 1979)");
  console.log("─────────────────────────────────────────\n");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance : ${ethers.formatEther(balance)} RITUAL\n`);

  // Pixel price: 0.001 RITUAL (1e15 wei)
  const pixelPrice = ethers.parseEther("0.001");
  console.log(`Pixel price      : ${ethers.formatEther(pixelPrice)} RITUAL per pixel`);

  console.log("\nDeploying PixelMind contract...");
  const PixelMind = await ethers.getContractFactory("PixelMind");
  const pixelMind = await PixelMind.deploy(pixelPrice);

  await pixelMind.waitForDeployment();

  const contractAddress = await pixelMind.getAddress();
  console.log(`\n✓ PixelMind deployed at: ${contractAddress}`);
  console.log(`  Canvas size: 1000 × 500 = 500,000 pixels`);

  // ── Write deployment info ──────────────────────────────────────────────────
  const deploymentInfo = {
    network: "ritual-testnet",
    chainId: 1979,
    contractAddress,
    pixelPrice: ethers.formatEther(pixelPrice),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  fs.writeFileSync(
    path.join(deploymentsDir, "ritual-testnet.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // ── Write .env hint for frontend ──────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  console.log("  Next steps — update frontend/.env.local:");
  console.log("─────────────────────────────────────────");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your_project_id>`);
  console.log("─────────────────────────────────────────\n");
  console.log("Deployment complete! 🎨");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
