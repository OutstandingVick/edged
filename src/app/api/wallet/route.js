import { getOrCreateAgentWallet, getWalletBalance } from "@/lib/circle";

export const runtime = "nodejs";

function isMissing(value) {
  return !value || value.includes("your_") || value.trim() === "";
}

export async function GET() {
  if (isMissing(process.env.CIRCLE_API_KEY) || isMissing(process.env.CIRCLE_ENTITY_SECRET)) {
    return Response.json({
      configured: false,
      demo: true,
      wallet: {
        id: "demo-wallet-id",
        address: "0x000000000000000000000000000000AgentOracle",
        blockchain: "ARC-TESTNET",
        state: "DEMO",
      },
      balances: [{ token: { symbol: "USDC" }, amount: "100.00" }],
      message: "Add CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET to .env.local for a real Arc Testnet wallet.",
    });
  }

  try {
    const { wallet, walletSetId, isNew } = await getOrCreateAgentWallet();
    const balances = await getWalletBalance(wallet.id);

    return Response.json({
      configured: true,
      demo: false,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        state: wallet.state,
      },
      escrowAddress: process.env.CIRCLE_ESCROW_ADDRESS || null,
      liveMode: process.env.PAPER_TRADING === "false",
      balances,
      walletSetId,
      isNew,
      ...(isNew && {
        saveToEnv: {
          CIRCLE_WALLET_ID: wallet.id,
          CIRCLE_WALLET_ADDRESS: wallet.address,
          CIRCLE_WALLET_SET_ID: walletSetId,
        },
      }),
    });
  } catch (err) {
    return Response.json(
      {
        configured: true,
        demo: false,
        error: err.message,
        message: "Circle wallet setup failed. Confirm the entity secret is registered in Circle Console.",
      },
      { status: 500 }
    );
  }
}
