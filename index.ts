import {
  getAssociatedTokenAddress,
} from '@solana/spl-token'
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionInstruction,
  TransactionMessage,
  ComputeBudgetProgram,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import {
  BUY_INTERVAL_MAX,
  BUY_INTERVAL_MIN,
  SELL_INTERVAL_MAX,
  SELL_INTERVAL_MIN,
  BUY_LOWER_PERCENT,
  BUY_UPPER_PERCENT,
  DISTRIBUTE_WALLET_NUM,
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  TOKEN_MINT,
  TOKEN_NAME,
  WISH_WORD,
  SWAP_ROUTING,
  POOL_ID,
} from './constants'
import { Data, readJson, saveDataToFile, sleep } from './utils'
import base58 from 'bs58'
import { getBuyTx, getBuyTxWithJupiter, getSellTx, getSellTxWithJupiter } from './utils/swapOnlyAmm'
import { execute } from './executor/legacy'
import { obfuscateString, sendMessage } from './utils/tgNotification'
import axios from 'axios'
import { swapOnMeteora } from './utils/meteoraSwap'
import { getWallets } from './utils/wallet'

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
})

export const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const baseMint = new PublicKey(TOKEN_MINT)
const quoteMint = new PublicKey("So11111111111111111111111111111111111111112")


const main = async () => {

  // curSolPrice = await getSolPrice();

  const solBalance = await solanaConnection.getBalance(mainKp.publicKey)
  console.log(`Volume bot is running`)
  console.log(`Wallet address: ${mainKp.publicKey.toBase58()}`)
  console.log(`Pool token mint: ${baseMint.toBase58()}`)
  console.log(`Wallet SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(3)}SOL`)
  console.log(`Buying wait time max: ${BUY_INTERVAL_MAX}s`)
  console.log(`Buying wait time min: ${BUY_INTERVAL_MIN}s`)
  console.log(`Selling wait time max: ${SELL_INTERVAL_MAX}s`)
  console.log(`Selling wait time min: ${SELL_INTERVAL_MIN}s`)
  console.log(`Buy upper limit percent: ${BUY_UPPER_PERCENT}%`)
  console.log(`Buy lower limit percent: ${BUY_LOWER_PERCENT}%`)

  const wallets = await getWallets()

  await Promise.all(wallets.map(async ({ keypair }, i) => {
    await sleep(i * 30000); 

    const srcKp = keypair;

    while (true) {
      const BUY_WAIT_INTERVAL = Math.round(Math.random() * (BUY_INTERVAL_MAX - BUY_INTERVAL_MIN) + BUY_INTERVAL_MIN);
      const SELL_WAIT_INTERVAL = Math.round(Math.random() * (SELL_INTERVAL_MAX - SELL_INTERVAL_MIN) + SELL_INTERVAL_MIN);

      const solBalance = await solanaConnection.getBalance(srcKp.publicKey);
      const buyPercent = Number((Math.random() * (BUY_UPPER_PERCENT - BUY_LOWER_PERCENT) + BUY_LOWER_PERCENT).toFixed(3));
      const buyAmount = Math.floor((solBalance - 0.5 * 10 ** 6) / 100 * buyPercent);

      console.log(`[${srcKp.publicKey.toBase58()}] Balance: ${solBalance / 1e9} SOL | Buy amount: ${buyAmount / 1e9} SOL`);

      const actions = Math.random() < 0.5
        ? ['buy', 'sell']
        : ['sell', 'buy'];

      for (const action of actions) {
        if (action === 'buy') {
          let tries = 0;
          while (tries <= 10) {
            try {
              const result = await buy(srcKp, baseMint, buyAmount);
              if (result) break;
            } catch (_) {}
            tries++;
            await sleep(2000);
          }
          if (tries > 10) {
            console.log(`[${srcKp.publicKey.toBase58()}] Buy failed after 10 attempts`);
            return;
          }

          await sleep(BUY_WAIT_INTERVAL * 1000);
        } else if (action === 'sell') {
          let tries = 0;
          while (tries <= 10) {
            try {
              const result = await sell(srcKp, baseMint);
              if (result) break;
            } catch (_) {}
            tries++;
            await sleep(2000);
          }
          if (tries > 10) {
            console.log(`[${srcKp.publicKey.toBase58()}] Sell failed after 10 attempts`);
            return;
          }

          await sleep(SELL_WAIT_INTERVAL * 1000);
        }
      }
    }
  }));
}



const buy = async (newWallet: Keypair, baseMint: PublicKey, buyAmount: number) => {
  let solBalance: number = 0
  try {
    solBalance = await solanaConnection.getBalance(newWallet.publicKey)
  } catch (error) {
    console.log("Error getting balance of wallet")
    // sendMessage("Error getting balance of wallet")
    return 'skip'
  }
  if (solBalance == 0) {
    return 'skip'
  }
  try {
    const buyTx = await getBuyTxWithJupiter(newWallet, baseMint, Math.round(buyAmount))

    if (buyTx) {
      const latestBlockhashForSell = await solanaConnection.getLatestBlockhash()
      const sig = await execute(buyTx, latestBlockhashForSell, true)
      return sig
    }

  } catch (error: any) {
    console.error(error.stack)
  }
}

const sell = async (newWallet: Keypair, baseMint: PublicKey) => {
  const tokenAta = await getAssociatedTokenAddress(baseMint, newWallet.publicKey)
  const tokenBal = await solanaConnection.getTokenAccountBalance(tokenAta)
  if (!tokenBal || !tokenBal.value.uiAmountString || tokenBal.value.uiAmount == 0)
    return 'skip'

  const balance = tokenBal.value.amount

  try {
    const sellTx = await getSellTxWithJupiter(newWallet, baseMint, balance)

    if (sellTx) {
      const latestBlockhashForSell = await solanaConnection.getLatestBlockhash()
      const sig = await execute(sellTx, latestBlockhashForSell, false)
      return sig
    }

  } catch (error: any) {
    console.error(error.stack)
  }
}

main()
