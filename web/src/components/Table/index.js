export * from "./Table";
export * from "./useTablePagination";
export * from "./useTableSort";

// TODO: move utils table here

export const renderPercent = (c, { field }) => {
  const value = c[field];
  if (!value || value < 0) {
    return "—";
  }

  return value.toFixed(2) + "%";
};

export const renderHFOrNA = (c, { field }) => {
  const value = c[field];
  if (value <= 0) {
    return "—";
  }

  return value.toFixed(4);
};
