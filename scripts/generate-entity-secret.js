/**
 * Run this ONCE to generate your Circle entity secret:
 * node scripts/generate-entity-secret.js
 * 
 * Copy the output into your .env.local as CIRCLE_ENTITY_SECRET
 * Keep it safe — losing it means losing access to your wallets.
 */

const { generateEntitySecret } = require("@circle-fin/developer-controlled-wallets");

const secret = generateEntitySecret();
console.log("\n✓ Your Circle Entity Secret (save this to .env.local):\n");
console.log(`CIRCLE_ENTITY_SECRET=${secret}`);
console.log("\n⚠️  Store this securely. Do NOT commit it to git.\n");
