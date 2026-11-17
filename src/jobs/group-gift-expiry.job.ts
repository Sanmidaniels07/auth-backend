import { expireGroupGiftsService } from "../modules/group-gift/group-gift.service";

// Closes group gifts whose deadline passed before friends covered the total,
// and refunds everyone who chipped in. Every 15 minutes.
const INTERVAL_MS = 15 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;

let running = false;

const run = async () => {
  if (running) return;
  running = true;
  try {
    const closed = await expireGroupGiftsService();
    if (closed > 0) console.log(`Closed ${closed} expired group gift(s) and refunded contributors.`);
  } catch (error) {
    console.error("Group gift expiry job failed:", error);
  } finally {
    running = false;
  }
};

export const startGroupGiftExpiryJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
