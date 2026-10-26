import { sendCacRemindersService } from "../modules/seller/cac-reminders.service";
import { nigeriaHour } from "../utils/birthday";

// Checked hourly; reminders go out from 9am Nigeria time. Each reminder is
// claimed before it's sent, so repeated runs (or several instances) never
// double up, and a host that slept through the morning catches up later.
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000;
const SEND_FROM_HOUR = 9;

let running = false;

const run = async () => {
  if (running || nigeriaHour() < SEND_FROM_HOUR) return;
  running = true;

  try {
    const sent = await sendCacRemindersService();
    if (sent > 0) console.log(`Sent ${sent} CAC reminder(s).`);
  } catch (error) {
    console.error("CAC reminders job failed:", error);
  } finally {
    running = false;
  }
};

export const startCacRemindersJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
