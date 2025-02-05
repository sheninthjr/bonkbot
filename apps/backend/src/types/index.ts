export interface Wallet {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
}

declare global {
  namespace Express {
    export interface Request {
      telegramId?: string
    }
  }
}