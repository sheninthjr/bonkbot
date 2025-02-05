import { Request, Response, Router } from "express";
import prisma from "@repo/db/prisma";
import { generateWallet } from "../utils";
import { generateMnemonic } from "bip39";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import axios from "axios";
import { ethers } from "ethers";
import { connection } from "../config";

const router: Router = Router();

router.post("/signup", async (req: Request, res: Response) => {
  const telegramId = req.body.telegram_id;
  const mnemonic = generateMnemonic();
  const solanaAddress = generateWallet("501", mnemonic);
  const ethAddress = generateWallet("60", mnemonic);
  try {
    const existingUser = await prisma.user.findFirst({
      where: { telegramId },
      include: { secrets: true },
    });

    if (existingUser) {
      res.status(200).json({
        ethAddress: existingUser.secrets.find((x) => x.addressType === "ETH")
          ?.publicKey,
        solanaAddress: existingUser.secrets.find((x) => x.addressType === "SOL")
          ?.publicKey,
        message: "User already exists",
      });
    } else {
      const user = await prisma.user.create({
        data: {
          telegramId,
          seedPrase: solanaAddress.mnemonic,
          secrets: {
            createMany: {
              data: [
                {
                  privateKey: solanaAddress.privateKey,
                  publicKey: solanaAddress.publicKey,
                  addressType: "SOL",
                },
                {
                  privateKey: ethAddress.privateKey,
                  publicKey: ethAddress.publicKey,
                  addressType: "ETH",
                },
              ],
            },
          },
        },
      });

      if (user.id) {
        res.status(200).json({
          message: "Successfully Created a Wallet",
          ethAddress: ethAddress.publicKey,
          solAddress: solanaAddress.publicKey,
        });
      } else {
        res.status(401).json({
          message: "Wallet creation failed",
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
});

router.post("/signin", async (req: Request, res: Response) => {
  const telegramId = req.body.telegram_id;
  try {
    const existingUser = await prisma.user.findFirst({
      where: { telegramId },
      include: { secrets: true },
    });

    if (existingUser) {
      res.status(200).json({
        ethAddress: existingUser.secrets.find((x) => x.addressType === "ETH")
          ?.publicKey,
        solanaAddress: existingUser.secrets.find((x) => x.addressType === "SOL")
          ?.publicKey,
        message: "User already exists",
      });
    } else {
      res.status(400).json({
        message: "Please try to signup first",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
});

router.get("/seedphrase", async (req: Request, res: Response) => {
  try {
    const telegramId = req.query.telegram_id as string;
    const user = await prisma.user.findFirst({
      where: {
        telegramId,
      },
    });
    res.json({
      message: "Successfull",
      seedphrase: user?.seedPrase,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
});

router.get("/privatekey/:type", async (req: Request, res: Response) => {
  const telegramId = req.query.telegram_id as string;
  const type = req.params.type?.toUpperCase();
  const user = await prisma.user.findFirst({
    where: {
      telegramId,
    },
    include: {
      secrets: true,
    },
  });
  if (type === "SOL") {
    res.json({
      message: "Your SOL private key",
      privateKey: user?.secrets.find((x) => x.addressType === "SOL")
        ?.privateKey,
    });
    ``;
  } else if (type === "ETH") {
    res.json({
      message: "Your ETH private key",
      privateKey: user?.secrets.find((x) => x.addressType === "ETH")
        ?.privateKey,
    });
  }
});

router.get("/balance/:type", async (req: Request, res: Response) => {
  const telegramId = req.params.telegram_id;
  const type = req.params.type?.toUpperCase();

  try {
    const user = await prisma.user.findFirst({
      where: { telegramId },
      include: { secrets: true },
    });
    if (user) {
      const solAddress = user.secrets.find(
        (x) => x.addressType === "SOL"
      )?.publicKey;
      const ethAddress = user.secrets.find(
        (x) => x.addressType === "ETH"
      )?.publicKey;

      if (type === "SOL") {
        const sol = await connection.getBalance(new PublicKey(solAddress!));
        const solbalance = (sol / LAMPORTS_PER_SOL).toString();
        res.json({
          solbalance,
        });
      } else if (type === "ETH") {
        const eth = await axios.post(process.env.ETH_RPC!, {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [ethAddress, "latest"],
        });
        const ethbalance = ethers.formatEther(eth.data.result);
        res.json({
          ethbalance,
        });
      }
    }
  } catch (error) {}
});

export default router;
