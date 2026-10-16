import { isStaging } from "../config/environment";
import { autoConfirmDeliveriesService } from "../modules/order/order.service";

// Hourly in production; every 5 minutes on staging so a shortened
// AUTO_CONFIRM_DAYS is visible to testers without a long wait.
const INTERVAL_MS = (isStaging ? 5 : 60) * 60 * 1000;
// Let the server finish booting (DB pool, socket) before the first run.
const FIRST_RUN_DELAY_MS = 60 * 1000;

let running = false;

const run = async () => {
  if (running) return;
  running = true;

  try {
    const confirmed = await autoConfirmDeliveriesService();
    if (confirmed > 0) console.log(`Auto-confirmed ${confirmed} delivered order item(s).`);
  } catch (error) {
    console.error("Auto-confirm deliveries job failed:", error);
  } finally {
    running = false;
  }
};

// In-process schedule: confirms delivered items buyers haven't responded
// to. Safe to run on several instances or repeatedly - each item is
// claimed with a guarded update. On hosts that sleep when idle it simply
// catches up on the next wake.
export const startAutoConfirmDeliveriesJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
