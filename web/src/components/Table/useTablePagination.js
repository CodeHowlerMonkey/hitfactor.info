import { useState, useMemo } from "react";
import qs from "query-string";

export const useTablePagination = () => {
  const [page, setPage] = useState(1);
  const [first, setFirst] = useState(0);

  return useMemo(
    () => ({
      first,
      paginator: true,
      rows: 100,
      rowsPerPageOptions: [100],
      paginatorPosition: "both",
      onPage: (e) => {
        setFirst(e.first);
        setPage(e.page + 1);
      },
      reset: () => {
        setFirst(0);
        setPage(1);
      },
      query: qs.stringify({ page }),
    }),
    [page, first]
  );
};

export default useTablePagination;
