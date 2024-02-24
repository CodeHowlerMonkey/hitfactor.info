export * from "./Table";
export * from "./useTablePagination";
export * from "./useTableSort";

export const renderPercent = (c, { field }) => {
  const value = c[field];
  if (value < 0) {
    return "—";
  }

  return value + "%";
};
