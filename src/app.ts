import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import cartRoutes from "./modules/cart/cart.routes";
import addressRoutes from "./modules/address/address.routes";
import checkoutRoutes from "./modules/checkout/checkout.routes";
import orderRoutes from "./modules/order/order.routes";
import reviewRoutes from "./modules/review/review.routes";
import profileRoutes from "./modules/profile/profile.routes";
import followRoutes from "./modules/follow/follow.routes";
import userRoutes from "./modules/user/user.routes";
import hashtagRoutes from "./modules/hashtag/hashtag.routes";
import communityRoutes from "./modules/community/community.routes";
import eventRoutes from "./modules/event/event.routes";
import uploadRoutes from "./modules/upload/upload.routes";
import couponRoutes from "./modules/coupon/coupon.routes";
import returnRequestRoutes from "./modules/return-request/return-request.routes";
import reportRoutes from "./modules/report/report.routes";
import conversationRoutes from "./modules/conversation/conversation.routes";
import storyRoutes from "./modules/story/story.routes";
import accountRoutes from "./modules/account/account.routes";
import twoFactorRoutes from "./modules/twofactor/twofactor.routes";
import blockRoutes from "./modules/block/block.routes";
import searchRoutes from "./modules/search/search.routes";
import payoutRoutes from "./modules/payout/payout.routes";
import paymentMethodRoutes from "./modules/payment-method/payment-method.routes";
import adminRoutes from "./modules/admin/admin.routes";

import { authMiddleware } from "./middleware/auth-middleware";
import { authorize } from "./middleware/role.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { AppError } from "./utils/appError";
import { getBackendUrl } from "./utils/getBackendUrl";

import { swaggerSpec } from "./config/swagger";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  getBackendUrl(),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new AppError("Not allowed by CORS", 403));
      }
    },
    credentials: true,
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  })
);

app.use(cookieParser());

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

app.use("/api/profile", profileRoutes);

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

app.use("/api/cart", cartRoutes);

app.use("/api/addresses", addressRoutes);

app.use("/api/checkout", checkoutRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/follow", followRoutes);

app.use("/api/users", userRoutes);

app.use("/api/hashtags", hashtagRoutes);

app.use("/api/communities", communityRoutes);

app.use("/api/events", eventRoutes);

app.use("/api/uploads", uploadRoutes);

app.use("/api/coupons", couponRoutes);

app.use("/api/returns", returnRequestRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/conversations", conversationRoutes);

app.use("/api/stories", storyRoutes);

app.use("/api/account", accountRoutes);

app.use("/api/2fa", twoFactorRoutes);

app.use("/api/blocks", blockRoutes);

app.use("/api/search", searchRoutes);

app.use("/api/admin/payouts", payoutRoutes);

app.use("/api/payment-methods", paymentMethodRoutes);

app.use("/api/admin", adminRoutes);

app.get("/", (_, res) => {
  res.send("API Running...");
});

app.use(errorHandler);

export default app;