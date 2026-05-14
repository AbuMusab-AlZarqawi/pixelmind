"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { PIXELMIND_ABI, PIXELMIND_ADDRESS } from "@/lib/contract";

export function usePixelPrice() {
  const { data: price } = useReadContract({
    address: PIXELMIND_ADDRESS,
    abi:     PIXELMIND_ABI,
    functionName: "pixelPrice",
  });
  return price as bigint | undefined;
}

export function useColorPixel(onSuccess?: (pixelId: number, color: number) => void) {
  const { address } = useAccount();
  const [pendingPixelId, setPendingPixelId] = useState<number | null>(null);

  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const colorPixel = useCallback(
    (pixelId: number, colorHex: string, price: bigint) => {
      if (!address) return;

      const color = parseInt(colorHex.replace("#", ""), 16);
      setPendingPixelId(pixelId);

      writeContract({
        address:      PIXELMIND_ADDRESS,
        abi:          PIXELMIND_ABI,
        functionName: "colorPixel",
        args:         [pixelId, color],
        value:        price,
      });
    },
    [address, writeContract]
  );

  // Notify parent on success
  const [notified, setNotified] = useState(false);
  if (isSuccess && pendingPixelId !== null && !notified) {
    setNotified(true);
    onSuccess?.(pendingPixelId, 0);
  }
  if (!isSuccess && notified) setNotified(false);

  return {
    colorPixel,
    isWritePending,
    isConfirming,
    isSuccess,
    txHash,
    writeError,
    pendingPixelId,
  };
}
