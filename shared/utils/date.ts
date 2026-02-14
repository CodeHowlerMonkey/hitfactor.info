export const UTCDate = (dateOrDateString: string | Date): Date => {
  const date = new Date(dateOrDateString);
  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  return date;
};

/** @returns difference between now and sd in months */
export const ageForDate = (now: Date, sd: Date | string): number =>
  (now.getTime() - new Date(sd).getTime()) / (28 * 24 * 60 * 60 * 1000);
