import { useState, useMemo } from "react";

const useTableSort = () => {
  const [sortState, setSortState] = useState({
    sortField: null,
    sortOrder: null,
  });
  return useMemo(
    () => ({
      ...sortState,
      onSort: ({ sortField, sortOrder }) =>
        setSortState({ sortField, sortOrder }),
    }),
    [sortState]
  );
};

export default useTableSort;
