import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./modules/auth/auth-routes";
import postRoutes from "./modules/posts/post.routes";
import commentRoutes from "./modules/comment/comment.routes";
import likeRoutes from "./modules/like/like.routes";
import sessionRoutes from "./modules/session/session.route";
import verificationRoutes from "./modules/verification/verification.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import sellerRoutes from "./modules/seller/seller.routes";
import storeRoutes from "./modules/store/store.routes";
import categoryRoutes from "./modules/category/category.routes";
import productRoutes from "./modules/product/product.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import wishlistRoutes from "./modules/wishlist/wishlist.routes";

import { authMiddleware } from "./middleware/auth-middleware";
import { authorize } from "./middleware/role.middleware";
import { errorHandler } from "./middleware/error.middleware";

import { swaggerSpec } from "./config/swagger";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.get("/swagger-json", (_, res) => {
  res.json(swaggerSpec);
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);

app.use("/api/posts", postRoutes);

app.use("/api/comments", commentRoutes);

app.use("/api/likes", likeRoutes);

app.use("/api/session", sessionRoutes);

app.use("/api/verify-email", verificationRoutes);

app.use("/api/notifications", notificationRoutes);

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

app.get("/api/profile", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

app.get(
  "/api/admin/dashboard",
  authMiddleware,
  authorize("ADMIN"),
  (_, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
    });
  }
);

app.use("/api/seller", sellerRoutes);

app.use("/api/stores", storeRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/products", productRoutes);

app.use("/api/seller/dashboard", dashboardRoutes);

app.use("/api/wishlist", wishlistRoutes);

app.get("/", (_, res) => {
  res.send("API Running...");
});

app.use(errorHandler);

export default app;