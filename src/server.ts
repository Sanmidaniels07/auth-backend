import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { startAutoConfirmDeliveriesJob } from "./jobs/auto-confirm-deliveries.job";
import { startBirthdayRemindersJob } from "./jobs/birthday-reminders.job";
import { startSellerRemindersJob } from "./jobs/seller-reminders.job";

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startAutoConfirmDeliveriesJob();
  startBirthdayRemindersJob();
  startSellerRemindersJob();
});