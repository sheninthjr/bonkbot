import prisma from "@repo/db/prisma";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Router, Request, Response } from "express";
import { isValidSolanaAddress } from "../utils";
import { ethers } from "ethers";
import bs58 from "bs58";

const router: Router = Router();

const connection = new Connection(process.env.SOL_RPC!);
const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC);

router.post("/transfer", async (req: Request, res: Response) => {
  const telegramId = req.body.telegram_id;
  const { toAddress, amount, type } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: { telegramId },
      include: { secrets: true },
    });
    if (user) {
      if (type === "SOL") {
        if (!isValidSolanaAddress(toAddress)) {
          res.status(401).json({
            message: "Not a Valid Solana Address",
          });
        }
        const privatekey = user.secrets.find(
          (x) => x.addressType === "SOL"
        )?.privateKey;
        const publickey = user.secrets.find(
          (x) => x.addressType === "SOL"
        )?.publicKey;
        if (!publickey && !privatekey) {
          res.status(500).json({
            message: "Address invalid",
          });
        }

        const sol = await connection.getBalance(new PublicKey(publickey!));
        const solbalance = sol / LAMPORTS_PER_SOL;

        if (solbalance < amount) {
          res.status(401).json({
            message: `Your SOL balance is ${solbalance} not sufficient to transfer`,
          });
        } else {
          const transaction = new Transaction();
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(publickey!),
              toPubkey: toAddress,
              lamports: amount * LAMPORTS_PER_SOL,
            })
          );
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = new PublicKey(publickey!);

          const secretKey = bs58.decode(privatekey!);
          const signer = Keypair.fromSecretKey(secretKey);

          transaction.sign(signer);

          const signature = await connection.sendRawTransaction(
            transaction.serialize()
          );

          const confirmation = await connection.sendTransaction(transaction, [
            signer,
          ]);

          if (confirmation) {
            res.status(200).json({
              message: "Transaction Successfull",
              signature,
            });
          }
        }
      } else if (type === "ETH") {
        const privatekey = user.secrets.find(
          (x) => x.addressType === "ETH"
        )?.privateKey;
        if (!privatekey) {
          res.status(401).json({
            message: "Private Key not found",
          });
        } else {
          const wallet = new ethers.Wallet(privatekey, ethProvider);
          const balance = await ethProvider.getBalance(wallet.address);
          const ethbalance = Number(ethers.formatEther(balance));

          if (ethbalance < amount) {
            res.status(401).json({
              message: `Your ETH balance is ${ethbalance} not sufficient to transfer`,
            });
          }
          const tx = {
            to: toAddress,
            value: ethers.parseEther(amount.toString()),
          };

          try {
            const gasEstimation = await ethProvider.estimateGas(tx);

            const transaction = {
              ...tx,
              gasLimit: gasEstimation,
            };

            const txResponse = await wallet.sendTransaction(transaction);

            const receipt = await txResponse.wait();

            res.status(200).json({
              message: "Transaction Successful",
              hash: receipt?.hash,
              blockNumber: receipt?.blockNumber,
            });
          } catch (error) {
            res.status(401).json({
              message: "Transaction Failed",
            });
          }
        }
      } else {
        res.status(401).json({
          message: "Invalid Transaction type"
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
});

export default router;
