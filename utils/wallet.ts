import { Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import bs58 from 'bs58';

const WALLET_FILE = path.resolve('/volume/secrets/', 'wallets.json');

interface WalletEntry {
  public_key: string;
  private_key: string;
}

interface Wallet {
  publicKey: PublicKey;
  keypair: Keypair;
}

export async function getWallets(): Promise<Wallet[]> {
  try {
    const data = await fs.readFile(WALLET_FILE, 'utf8');
    const wallets: WalletEntry[] = JSON.parse(data);

    return wallets.map(({ public_key, private_key }) => {
      const secretKey = bs58.decode(private_key);
      const keypair = Keypair.fromSecretKey(secretKey);
      return {
        publicKey: new PublicKey(public_key),
        keypair,
      };
    });
  } catch (err) {
    console.error('Failed to load wallets:', err);
    return [];
  }
}
