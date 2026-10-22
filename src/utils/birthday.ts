import { z } from "zod";

export const DAY_MS = 24 * 60 * 60 * 1000;

// Nigeria is on WAT (UTC+1) all year - no daylight saving - so a fixed
// offset is exact. Birthdays are calendar dates, so "today" must be the
// Nigerian date, not the UTC one (which lags by an hour after midnight).
export const NIGERIA_UTC_OFFSET_MS = 60 * 60 * 1000;

export const MIN_SIGNUP_AGE = 13;
export const MAX_AGE = 100;

/** Today's calendar date in Nigeria, as a UTC-midnight Date. */
export const nigeriaToday = (now: Date = new Date()) => {
  const date = new Date(now.getTime() + NIGERIA_UTC_OFFSET_MS);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

/** The current hour (0-23) in Nigeria. */
export const nigeriaHour = (now: Date = new Date()) =>
  new Date(now.getTime() + NIGERIA_UTC_OFFSET_MS).getUTCHours();

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * When this date of birth falls in `year`. Dates of birth are stored as
 * UTC midnight, so UTC parts are the calendar parts. 29 February is
 * celebrated on 28 February in non-leap years.
 */
export const birthdayInYear = (dateOfBirth: Date, year: number) => {
  const month = dateOfBirth.getUTCMonth();
  const day = dateOfBirth.getUTCDate();

  if (month === 1 && day === 29 && !isLeapYear(year)) {
    return new Date(Date.UTC(year, 1, 28));
  }

  return new Date(Date.UTC(year, month, day));
};

/** Next time this birthday comes round, counting today. */
export const nextBirthday = (dateOfBirth: Date, today: Date) => {
  const thisYear = birthdayInYear(dateOfBirth, today.getUTCFullYear());
  return thisYear < today
    ? birthdayInYear(dateOfBirth, today.getUTCFullYear() + 1)
    : thisYear;
};

export const isBirthdayToday = (dateOfBirth: Date, today: Date) =>
  birthdayInYear(dateOfBirth, today.getUTCFullYear()).getTime() === today.getTime();

/**
 * Date-of-birth input for signup and profile edits: a real calendar date,
 * stored as UTC midnight, for someone aged 13-100.
 */
export const dateOfBirthField = z.coerce
  .date({ message: "Enter a valid date of birth." })
  .transform((date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())))
  .refine((date) => {
    const today = nigeriaToday();
    const youngest = new Date(today);
    youngest.setUTCFullYear(today.getUTCFullYear() - MIN_SIGNUP_AGE);
    return date <= youngest;
  }, `You must be at least ${MIN_SIGNUP_AGE} years old.`)
  .refine((date) => {
    const today = nigeriaToday();
    const oldest = new Date(today);
    oldest.setUTCFullYear(today.getUTCFullYear() - MAX_AGE);
    return date >= oldest;
  }, "Enter a valid date of birth.");

/** Optional variant - a blank form value ("" or null) means "not provided". */
export const optionalDateOfBirthField = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  dateOfBirthField.optional()
);
