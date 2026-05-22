/**
 * circle.js
 * Manages the agent's developer-controlled wallet on Arc Testnet.
 * 
 * First run: creates a WalletSet + Wallet, saves IDs to env.
 * Subsequent runs: reuses existing wallet.
 */

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

function getClient() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error("CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set in .env.local");
  }

  return initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
}

/**
 * Get or create the agent's wallet on Arc Testnet.
 * If CIRCLE_WALLET_ID is already in env, fetch that wallet.
 * Otherwise, create a new WalletSet + Wallet and return it.
 */
export async function getOrCreateAgentWallet() {
  const client = getClient();

  // If wallet already exists, return it
  if (process.env.CIRCLE_WALLET_ID) {
    try {
      const res = await client.getWallet({ id: process.env.CIRCLE_WALLET_ID });
      const wallet = res.data?.wallet;
      if (wallet) return { wallet, isNew: false };
    } catch (err) {
      console.warn("Could not fetch existing wallet, creating new one:", err.message);
    }
  }

  let walletSetId = process.env.CIRCLE_WALLET_SET_ID;

  if (!walletSetId) {
    const setName = `AgentOracle-${Date.now()}`;
    const walletSetRes = await client.createWalletSet({ name: setName });
    walletSetId = walletSetRes.data?.walletSet?.id;
    if (!walletSetId) throw new Error("Failed to create WalletSet");
  }

  // Create wallet on Arc Testnet
  const walletRes = await client.createWallets({
    blockchains: ["ARC-TESTNET"],
    count: 1,
    walletSetId,
  });

  const wallet = walletRes.data?.wallets?.[0];
  if (!wallet) throw new Error("Failed to create wallet on Arc Testnet");

  return { wallet, walletSetId, isNew: true };
}

/**
 * Get wallet token balances (USDC on Arc Testnet)
 */
export async function getWalletBalance(walletId) {
  const client = getClient();
  try {
    const res = await client.getWalletTokenBalance({ id: walletId });
    return res.data?.tokenBalances || [];
  } catch (err) {
    console.error("Balance fetch error:", err.message);
    return [];
  }
}

/**
 * Send USDC from agent wallet (for live trade execution — Day 3)
 */
export async function sendUSDC({ walletId, destinationAddress, amount }) {
  const client = getClient();
  const tokenId = process.env.CIRCLE_USDC_TOKEN_ID;

  if (!walletId) throw new Error("CIRCLE_WALLET_ID is required for live execution");
  if (!destinationAddress) throw new Error("CIRCLE_ESCROW_ADDRESS is required for live execution");
  if (!tokenId) throw new Error("CIRCLE_USDC_TOKEN_ID is required for live execution");

  const res = await client.createTransaction({
    walletId,
    tokenId,
    destinationAddress,
    amount: [amount.toString()],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  return res.data?.transaction;
}
