import { isStaging } from "../config/environment";
import { runHeldPayoutsService } from "../modules/payout/held-payout.service";
import { processReturnDeadlinesService } from "../modules/return-request/return-request.service";

// Every 30 minutes in production; every 5 minutes on staging so testers
// don't wait. Each run:
//   1. passes reports the seller didn't answer in time to Nestly, and closes
//      replacements nobody confirmed within a week;
//   2. pays sellers whose return windows have closed (hold-then-pay) - at
//      most one transfer per seller a day in production.
const INTERVAL_MS = (isStaging ? 5 : 30) * 60 * 1000;
// Let the server finish booting before the first run.
const FIRST_RUN_DELAY_MS = 3 * 60 * 1000;

let running = false;

const run = async () => {
  if (running) return;
  running = true;

  try {
    const deadlines = await processReturnDeadlinesService();
    if (deadlines.escalated || deadlines.replaced) {
      console.log(`Returns: ${deadlines.escalated} passed to Nestly, ${deadlines.replaced} replacement(s) closed.`);
    }

    const payouts = await runHeldPayoutsService();
    if (payouts.transfers || payouts.settled) {
      console.log(`Payouts: ${payouts.transfers} transfer(s) sent, ${payouts.settled} order(s) closed with nothing to pay.`);
    }
  } catch (error) {
    console.error("Payouts job failed:", error);
  } finally {
    running = false;
  }
};

// In-process schedule. Orders are claimed before any money moves and every
// report change is a guarded update, so running on several instances or
// after a restart never pays or escalates twice.
export const startPayoutsJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
