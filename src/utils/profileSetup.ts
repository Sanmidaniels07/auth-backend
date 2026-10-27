// The "Finish your profile" checklist shown on the dashboard after signup
// (most useful for Google sign-ups, who only bring a name, email and photo)
// and used by jobs/profile-reminders.

export type ProfileStepKey = "USERNAME" | "PHOTO" | "BIRTHDAY" | "BIO" | "ADDRESS";

export const PROFILE_STEPS: { key: ProfileStepKey; title: string; why: string; path: string }[] = [
  {
    key: "USERNAME",
    title: "Choose a username",
    why: "So people can find, mention and share your profile.",
    path: "/settings/profile",
  },
  {
    key: "PHOTO",
    title: "Add a profile photo",
    why: "Buyers and sellers trust a face more than initials.",
    path: "/settings/profile",
  },
  {
    key: "BIRTHDAY",
    title: "Add your birthday",
    why: "Your followers get a reminder to celebrate you. Your age stays private.",
    path: "/settings/profile",
  },
  {
    key: "BIO",
    title: "Write a short bio",
    why: "A line about you helps people decide to follow you.",
    path: "/settings/profile",
  },
  {
    key: "ADDRESS",
    title: "Save a delivery address",
    why: "Check out in one tap when you find something you like.",
    path: "/settings/profile#addresses",
  },
];

export const PROFILE_SETUP_SELECT = {
  username: true,
  avatar: true,
  dateOfBirth: true,
  bio: true,
  _count: { select: { addresses: true } },
} as const;

export const missingProfileSteps = (user: {
  username: string | null;
  avatar: string | null;
  dateOfBirth: Date | null;
  bio: string | null;
  _count: { addresses: number };
}): ProfileStepKey[] => {
  const done: Record<ProfileStepKey, boolean> = {
    USERNAME: !!user.username,
    PHOTO: !!user.avatar,
    BIRTHDAY: !!user.dateOfBirth,
    BIO: !!user.bio?.trim(),
    ADDRESS: user._count.addresses > 0,
  };
  return PROFILE_STEPS.filter((step) => !done[step.key]).map((step) => step.key);
};
