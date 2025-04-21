import { Keypair } from '@solana/web3.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const WALLET_FILE = path.resolve(__dirname, 'wallets.json');

interface WalletEntry {
  public_key: string;
  private_key: string; // Base64 or stringified
  balance: number;
}

async function generateWallets(walletNum: number): Promise<void> {
  let existingWallets: WalletEntry[] = [];

  // Read existing wallets if file exists
  try {
    const fileData = await fs.readFile(WALLET_FILE, 'utf8');
    existingWallets = JSON.parse(fileData);
  } catch {
    // File doesn't exist or is empty — skip
  }

  // Generate new wallets
  const newWallets: WalletEntry[] = [];

  for (let i = 0; i < walletNum; i++) {
    const wallet = Keypair.generate();

    newWallets.push({
      public_key: wallet.publicKey.toBase58(),
      private_key: Buffer.from(wallet.secretKey).toString('base64'), // Safer than printing raw array
      balance: 0,
    });
  }

  const allWallets = [...existingWallets, ...newWallets];

  // Write to file
  await fs.writeFile(WALLET_FILE, JSON.stringify(allWallets, null, 2), 'utf8');
  console.log(`Generated ${walletNum} wallets and saved to wallets.json`);
}

async function main() {
  const numWallets = 5; // Example: generate 5 wallets
  await generateWallets(numWallets);
}

main();
