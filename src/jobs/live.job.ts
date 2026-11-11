import {
  announceNewLivesService,
  cancelNoShowLivesService,
  enforceLiveTimeLimitService,
  sendLiveRemindersService,
} from "../modules/live/live-jobs.service";

// Live selling timers (see live-jobs.service): follower announcements,
// 24h / 15-minute reminders, the 60-minute limit and no-shows. Every minute,
// day and night - lives happen when sellers schedule them.
const INTERVAL_MS = 60 * 1000;
const FIRST_RUN_DELAY_MS = 30 * 1000;

let running = false;

const run = async () => {
  if (running) return;
  running = true;
  try {
    await enforceLiveTimeLimitService();
    await sendLiveRemindersService();
    await announceNewLivesService();
    await cancelNoShowLivesService();
  } catch (error) {
    console.error("Live job failed:", error);
  } finally {
    running = false;
  }
};

export const startLiveJob = () => {
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
};
