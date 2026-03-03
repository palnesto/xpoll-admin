export function getTxExplorerUrl(txHash: string): string {
  if (!txHash) return "#";

  const viteEnvMode = import.meta.env.VITE_MODE;
  const isMainnet = viteEnvMode === "production";
  return isMainnet
    ? `https://basescan.org/tx/${txHash}`
    : `https://sepolia.basescan.org/tx/${txHash}`;
}
