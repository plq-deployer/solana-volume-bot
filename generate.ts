import { Keypair } from '@solana/web3.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import bs58 from 'bs58';
import { DISTRIBUTE_WALLET_NUM } from './constants';

const WALLET_FILE = path.resolve('/volume/secrets/', 'wallets.json');

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
      private_key: bs58.encode(wallet.secretKey), // Safer than printing raw array
      balance: 0,
    });
  }

  const allWallets = [...existingWallets, ...newWallets];

  // Write to file
  await fs.writeFile(WALLET_FILE, JSON.stringify(allWallets, null, 2), 'utf8');
  console.log(`Generated ${walletNum} wallets and saved to wallets.json`);
}

async function main() {
  const numWallets = DISTRIBUTE_WALLET_NUM; 
  await generateWallets(numWallets);
}

main();
