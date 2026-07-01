import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth-routes";
import { authMiddleware, AuthRequest } from "./middleware/auth-middleware";
import { authorize } from "./middleware/role.middleware";
import postRoutes from "./routes/post.routes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import commentRoutes from "./routes/comment.routes";
import likeRoutes from "./routes/like.routes";
import sessionRoutes from "./routes/session.route";
import verificationRoutes from "./routes/verification.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/profile", authMiddleware, (req: AuthRequest, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

app.get("/swagger-json", (req, res) => {
  res.json(swaggerSpec);
});

app.get(
  "/api/admin/dashboard",
  authMiddleware,
  authorize("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
    });
  },
);

app.get("/", (req, res) => {
  res.send("API Running...");
});

app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);

app.use("/api/likes", likeRoutes);

app.use("/api/session", sessionRoutes);

app.use("/api/verify-email", verificationRoutes);

app.use("/api/notifications", notificationRoutes);

export default app;
