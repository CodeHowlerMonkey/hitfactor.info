export const UTCDate = (dateOrDateString: string | Date): Date => {
  const date = new Date(dateOrDateString);
  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  return date;
};
