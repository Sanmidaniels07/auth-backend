import { sendReviewRemindersService } from "../modules/seller/review-reminders.service";

// Reminds admins about quick-start sellers waiting for their review (after
// a day, and when two days overdue). Hourly, any time of day - the sooner a
// review happens, the sooner an honest seller is paid.
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 4 * 60 * 1000;

let running = false;

const run = async () => {
  if (running) return;
  running = true;
  try {
    const sent = await sendReviewRemindersService();
    if (sent > 0) console.log(`Sent ${sent} seller review reminder(s).`);
  } catch (error) {
    console.error("Review reminders job failed:", error);
  } finally {
    running = false;
  }
};

export const startReviewRemindersJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
