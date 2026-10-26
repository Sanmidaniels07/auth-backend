import { sendCacRemindersService } from "../modules/seller/cac-reminders.service";
import { sendSetupRemindersService } from "../modules/seller/setup-reminders.service";
import { nigeriaHour } from "../utils/birthday";

// Seller nudges (finish setting up; add a CAC number). Checked hourly, sent
// from 9am Nigeria time. Each reminder is claimed before it's sent, so
// repeated runs or several instances never double up, and a host that slept
// through the morning catches up later.
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000;
const SEND_FROM_HOUR = 9;

let running = false;

const run = async () => {
  if (running || nigeriaHour() < SEND_FROM_HOUR) return;
  running = true;

  try {
    const setup = await sendSetupRemindersService();
    if (setup > 0) console.log(`Sent ${setup} setup reminder(s).`);
    const cac = await sendCacRemindersService();
    if (cac > 0) console.log(`Sent ${cac} CAC reminder(s).`);
  } catch (error) {
    console.error("Seller reminders job failed:", error);
  } finally {
    running = false;
  }
};

export const startSellerRemindersJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
