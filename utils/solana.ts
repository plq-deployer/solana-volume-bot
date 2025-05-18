import { Connection } from '@solana/web3.js';
import { RPC_ENDPOINT } from '../constants';

let currentIndex = 0;
let mutex: Promise<void> = Promise.resolve();

export async function getConnection(): Promise<Connection> {
  let conn!: Connection;

  await (mutex = mutex.then(() => {
    const rpcUrl = RPC_ENDPOINT[currentIndex];
    currentIndex = (currentIndex + 1) % RPC_ENDPOINT.length;
    conn = new Connection(rpcUrl, 'confirmed');
  }));

  return conn;
}
