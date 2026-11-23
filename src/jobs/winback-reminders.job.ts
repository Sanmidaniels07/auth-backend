import { sendWinbackRemindersService } from "../modules/winback/winback-reminders.service";
import { nigeriaHour } from "../utils/birthday";

// "We miss you" catch-ups for people away from Nestly (see
// winback-reminders.service). Checked hourly, sent between 9am and 9pm
// Nigeria time, a few per run. Each one is claimed before it's sent, so
// repeated runs or several instances never double up.
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;
const SEND_FROM_HOUR = 9;
const SEND_UNTIL_HOUR = 21;

let running = false;

const run = async () => {
  const hour = nigeriaHour();
  if (running || hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) return;
  running = true;

  try {
    const sent = await sendWinbackRemindersService();
    if (sent > 0) console.log(`Sent ${sent} "we miss you" reminder(s).`);
  } catch (error) {
    console.error("Winback reminders job failed:", error);
  } finally {
    running = false;
  }
};

export const startWinbackRemindersJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
