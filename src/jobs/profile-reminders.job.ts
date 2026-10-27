import { sendProfileRemindersService } from "../modules/profile/profile-reminders.service";
import { nigeriaHour } from "../utils/birthday";

// "Finish your profile" nudges for new members. Checked hourly, sent between
// 9am and 9pm Nigeria time. Each reminder is claimed before it's sent, so
// repeated runs or several instances never double up.
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 3 * 60 * 1000;
const SEND_FROM_HOUR = 9;
const SEND_UNTIL_HOUR = 21;

let running = false;

const run = async () => {
  const hour = nigeriaHour();
  if (running || hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) return;
  running = true;

  try {
    const sent = await sendProfileRemindersService();
    if (sent > 0) console.log(`Sent ${sent} profile reminder(s).`);
  } catch (error) {
    console.error("Profile reminders job failed:", error);
  } finally {
    running = false;
  }
};

export const startProfileRemindersJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
