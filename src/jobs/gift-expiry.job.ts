import { isStaging } from "../config/environment";
import { expireGiftsService } from "../modules/gift/gift.service";

// Hourly in production; every 5 minutes on staging so testers don't wait.
const INTERVAL_MS = (isStaging ? 5 : 60) * 60 * 1000;
// Let the server finish booting before the first run.
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000;

let running = false;

const run = async () => {
  if (running) return;
  running = true;

  try {
    const expired = await expireGiftsService();
    if (expired > 0) console.log(`Refunded ${expired} unclaimed gift(s).`);
  } catch (error) {
    console.error("Gift expiry job failed:", error);
  } finally {
    running = false;
  }
};

// In-process schedule: refunds gifts nobody accepted within the claim
// window. Each gift is closed with a guarded update, so it's safe to run on
// several instances or after a restart.
export const startGiftExpiryJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
