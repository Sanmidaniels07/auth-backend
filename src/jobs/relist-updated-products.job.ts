import { relistDueProducts } from "../utils/productCooldown";

// Puts edited products back on the marketplace once their few minutes of
// updating are up (utils/productCooldown). Every minute.
const INTERVAL_MS = 60 * 1000;

let running = false;

const run = async () => {
  if (running) return;
  running = true;
  try {
    const relisted = await relistDueProducts();
    if (relisted > 0) console.log(`Relisted ${relisted} updated product(s).`);
  } catch (error) {
    console.error("Relist updated products job failed:", error);
  } finally {
    running = false;
  }
};

export const startRelistUpdatedProductsJob = () => {
  setTimeout(run, 20 * 1000).unref();
  setInterval(run, INTERVAL_MS).unref();
};
