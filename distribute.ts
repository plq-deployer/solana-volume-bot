import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as fs from 'fs/promises';
import { DISTRIBUTE_AMOUNT_PER_WALLET, DISTRIBUTE_WALLET_NUM, PRIVATE_KEY, RPC_ENDPOINT } from './constants';
import * as path from 'path';
import bs58 from 'bs58';


const WALLET_FILE = path.resolve('/volume/secrets/', 'wallets.json');
const AMOUNT_PER_WALLET = DISTRIBUTE_AMOUNT_PER_WALLET

const distritbutionNum = DISTRIBUTE_WALLET_NUM > 20 ? 20 : DISTRIBUTE_WALLET_NUM;

const distributeSol = async (
  connection: Connection,
  mainKp: Keypair,
  distributionNum: number,
): Promise<string[] | null> => {
  try {
    const fileData = await fs.readFile(WALLET_FILE, 'utf8');
    const wallets: { public_key: string; private_key: string }[] = JSON.parse(fileData);

    const targets = wallets.slice(0, distributionNum);

    for (const wallet of targets) {
      const toPubkey = new PublicKey(wallet.public_key);
      const lamports = AMOUNT_PER_WALLET * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey,
          lamports,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction, [mainKp]);
    }

    // Save updated balances
    await fs.writeFile(WALLET_FILE, JSON.stringify(wallets, null, 2), 'utf8');

    return targets.map((w) => w.public_key);
  } catch (error) {
    console.error(`Failed to transfer SOL:`, error);
    return null;
  }
};

async function main() {
  const connection = new Connection(RPC_ENDPOINT); // or testnet/devnet
  const secret = bs58.decode(PRIVATE_KEY); // fill with your main wallet's secret key
  const mainKp = Keypair.fromSecretKey(secret);

  console.log(`Distribute SOL to ${distritbutionNum} wallets`);

  const result = await distributeSol(connection, mainKp, distritbutionNum);

  if (result) {
    console.log('Successfully distributed to wallets:', result);
  }
}

main();
