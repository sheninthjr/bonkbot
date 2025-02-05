import { mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { Wallet } from "../types";

export function generateWallet(coin_type: string, mnemonic: string): Wallet {
  const seed = mnemonicToSeedSync(mnemonic);
  const path = `m/44'/${coin_type}'/0'/0'`;
  const derivedSeed = derivePath(path, seed.toString("hex")).key;
  if (coin_type === "501") {
    const { secretKey } = nacl.sign.keyPair.fromSeed(derivedSeed);
    const keypair = Keypair.fromSecretKey(secretKey);
    return {
      mnemonic,
      privateKey: bs58.encode(secretKey),
      publicKey: keypair.publicKey.toBase58(),
    };
  } else if (coin_type === "60") {
    const privateKey = Buffer.from(derivedSeed).toString("hex");
    const wallet = new ethers.Wallet(privateKey);
    return {
      mnemonic,
      privateKey: wallet.privateKey,
      publicKey: wallet.address,
    };
  }
  throw new Error("Unsupported coin type");
}

export function isValidSolanaAddress(address: string) {
  try {
    const publickey = new PublicKey(address);
    return PublicKey.isOnCurve(publickey);
  } catch (error) {
    return false;
  }
}
