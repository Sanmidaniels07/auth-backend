import {
  notifyFollowersOfNewProductsService,
  sendBackInStockAlertsService,
  sendCartRemindersService,
} from "../modules/shopping-alerts/shopping-alerts.service";
import { nigeriaHour } from "../utils/birthday";

// Buyer shopping updates (see shopping-alerts.service): new products from
// followed stores, cart reminders and back-in-stock alerts. Checked every
// 15 minutes between 8am and 9pm Nigeria time - anything that comes up
// overnight goes out in the morning.
const INTERVAL_MS = 15 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 3 * 60 * 1000;
const SEND_FROM_HOUR = 8;
const SEND_UNTIL_HOUR = 21;

let running = false;

const run = async () => {
  const hour = nigeriaHour();
  if (running || hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) return;
  running = true;

  try {
    const restocked = await sendBackInStockAlertsService();
    if (restocked > 0) console.log(`Sent ${restocked} back-in-stock alert(s).`);
    const followers = await notifyFollowersOfNewProductsService();
    if (followers > 0) console.log(`Sent ${followers} new-product alert(s) to followers.`);
    const carts = await sendCartRemindersService();
    if (carts > 0) console.log(`Sent ${carts} cart reminder(s).`);
  } catch (error) {
    console.error("Shopping alerts job failed:", error);
  } finally {
    running = false;
  }
};

export const startShoppingAlertsJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
