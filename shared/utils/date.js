export const UTCDate = (dateString) => {
  const date = new Date(dateString);
  date.setUTCHours(0);
  return date;
};
