import { NotificationType, UserStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import { profileReminderTemplate } from "../../templates/profile-reminder.template";
import { PROFILE_SETUP_SELECT, PROFILE_STEPS, missingProfileSteps } from "../../utils/profileSetup";

// New members whose profile is unfinished get two nudges, in the app and by
// email: a day after signing up, then 3 days after that. Only people who
// joined in the last couple of weeks, so existing members aren't suddenly
// emailed. The dashboard checklist shows the whole time.
const FIRST_AFTER_DAYS = 1;
const SECOND_AFTER_DAYS = 3;
const MAX_REMINDERS = 2;
const NEW_MEMBER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const frontend = () => process.env.FRONTEND_URL ?? "";

export const sendProfileRemindersService = async (now: Date = new Date()) => {
  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: new Date(now.getTime() - NEW_MEMBER_DAYS * DAY_MS) },
      profileRemindersSent: { lt: MAX_REMINDERS },
      deletedAt: null,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      profileRemindersSent: true,
      lastProfileReminderAt: true,
      ...PROFILE_SETUP_SELECT,
    },
  });

  let sent = 0;

  for (const user of users) {
    const missing = missingProfileSteps(user);
    if (missing.length === 0) continue;

    const dueAt = user.lastProfileReminderAt
      ? user.lastProfileReminderAt.getTime() + SECOND_AFTER_DAYS * DAY_MS
      : user.createdAt.getTime() + FIRST_AFTER_DAYS * DAY_MS;
    if (now.getTime() < dueAt) continue;

    // Claim this reminder first so overlapping runs can't send it twice.
    const claim = await prisma.user.updateMany({
      where: { id: user.id, profileRemindersSent: user.profileRemindersSent },
      data: { profileRemindersSent: { increment: 1 }, lastProfileReminderAt: now },
    });
    if (claim.count === 0) continue;

    const steps = PROFILE_STEPS.filter((step) => missing.includes(step.key));
    const message =
      steps.length === 1
        ? `One thing left: ${steps[0].title.toLowerCase()}.`
        : `${steps.length} quick things left: ${steps.map((step) => step.title.toLowerCase()).join(", ")}.`;

    await Promise.allSettled([
      createNotificationService(user.id, "Finish setting up your profile", message, NotificationType.SYSTEM, {
        type: "PROFILE_SETUP",
        id: user.id,
      }),
      sendEmail(
        user.email,
        "Finish setting up your Nestly profile",
        profileReminderTemplate(
          user.name,
          steps.map((step) => ({ title: step.title, why: step.why, url: `${frontend()}${step.path}` })),
          `${frontend()}/dashboard`
        )
      ),
    ]).then((results) =>
      results.forEach((result) => {
        if (result.status === "rejected") console.error(`Profile reminder to ${user.id} failed:`, result.reason);
      })
    );
    sent += 1;
  }

  return sent;
};
