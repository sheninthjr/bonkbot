import { Connection } from "@solana/web3.js";
import { config } from "dotenv";
config()

export const PORT: number = 3000;
export const SECRET: string = 'sheninthJr'

export const connection = new Connection(process.env.SOL_RPC!);
