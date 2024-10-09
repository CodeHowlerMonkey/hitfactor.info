export const UTCDate = (dateString: string): Date => {
  const date = new Date(dateString);
  date.setUTCHours(0);
  return date;
};
