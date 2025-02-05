import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { SECRET } from "../config";

export const middleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    res.sendStatus(401);
    return;
  }
  const token = authorization.split(" ")[1];
  try {
    const decode = jwt.verify(token!, SECRET);
    if (typeof decode === "string") {
      res.sendStatus(403);
      return;
    }
    req.telegramId = decode.telegram_id;
    next();
  } catch (error) {
    res.sendStatus(401);
    return;
  }
};
