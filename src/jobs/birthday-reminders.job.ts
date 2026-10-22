import { sendBirthdayRemindersService } from "../modules/birthday/birthday-reminders.service";
import { nigeriaHour } from "../utils/birthday";

// Checked hourly; reminders go out from 7am Nigeria time so nobody is
// pinged in the middle of the night. The service skips anything already
// sent today, so the repeated hourly runs only pick up stragglers (e.g. a
// host that was asleep at 7am).
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 90 * 1000;
const SEND_FROM_HOUR = 7;

let running = false;

const run = async () => {
  if (running || nigeriaHour() < SEND_FROM_HOUR) return;
  running = true;

  try {
    const sent = await sendBirthdayRemindersService();
    if (sent > 0) console.log(`Sent ${sent} birthday notification(s).`);
  } catch (error) {
    console.error("Birthday reminders job failed:", error);
  } finally {
    running = false;
  }
};

export const startBirthdayRemindersJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
