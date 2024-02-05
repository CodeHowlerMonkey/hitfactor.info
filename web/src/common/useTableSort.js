import { useState, useMemo } from "react";
import qs from "query-string";

const useTableSort = (mode = "single", onSortCallback) => {
  const [state, setState] = useState([]);
  const isSingle = mode === "single";

  const sortStateProps = isSingle
    ? { sortField: state[0]?.field, sortOrder: state[0]?.order }
    : state;

  return useMemo(
    () => ({
      ...(isSingle
        ? { sortField: state[0]?.field, sortOrder: state[0]?.order }
        : {
            multiSortMeta: state,
          }),
      onSort: (e) => {
        if (isSingle) {
          const { sortField, sortOrder } = e;
          setState([{ field: sortField, order: sortOrder }]);
        } else {
          setState(e.multiSortMeta);
        }
        onSortCallback?.();
      },
      removableSort: true,
      sortMode: mode,
      query: qs.stringify(
        {
          sort: state.map((s) => s.field),
          order: state.map((s) => s.order),
        },
        { arrayFormat: "comma" }
      ),
    }),
    [state, mode]
  );
};

export default useTableSort;
