import { Request, Response, Router } from "express";
import prisma from "@repo/db/prisma";
import { generateWallet } from "../utils";
import { generateMnemonic } from "bip39";

const router: Router = Router();

router.post("/signup", async (req: Request, res: Response) => {
  const phoneNumber = req.body.phoneNumber;
  const mnemonic = generateMnemonic();
  const solanaAddress = generateWallet("501", mnemonic);
  const ethAddress = generateWallet("60", mnemonic);
  try {
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber },
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
    }

    const user = await prisma.user.create({
      data: {
        phoneNumber,
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
      res
        .json({
          message: "Successfully Created a Wallet",
          ethAddress: ethAddress.publicKey,
          solAddress: solanaAddress.publicKey,
        })
        .status(200);
    } else {
      res.status(401).json({
        message: "Wallet creation failed",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
});

router.post("/signin", (req, res) => {
  const phoneNumber = req.body.phoneNumber;
});

export default router;
