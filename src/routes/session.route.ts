import { Router } from "express";
import {
    logout,
  refreshToken,
} from "../controllers/session.controllers";

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