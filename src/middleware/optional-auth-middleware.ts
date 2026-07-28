import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { JwtPayload } from "./auth-middleware";

export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
  } catch {
    // Invalid/expired token on a public route - proceed anonymously
    // rather than rejecting, since auth here is optional.
  }

  next();
};