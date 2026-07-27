import { Router } from "express";
import {
    logout,
  refreshToken,
} from "./session.controller";

const router = Router();

router.post(
  "/refresh",
  refreshToken
);

router.post(
  "/logout",
  logout
);

export default router;