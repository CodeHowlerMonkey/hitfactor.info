import qs from "query-string";
import { useState, useMemo } from "react";

interface SingleSortState {
  field: string;
  order: 1 | -1;
}

interface UseTableSortArgs {
  mode: "single" | "multiple";
  onSortCallback?: () => void;
  initial: SingleSortState | SingleSortState[];
}

export const useTableSort = ({
  mode = "single",
  onSortCallback,
  initial = [],
}: UseTableSortArgs) => {
  const initialArray = [].concat(initial as any) as SingleSortState[];
  const [state, setState] = useState<SingleSortState[]>(initialArray);
  const isSingle = mode === "single";

  return useMemo(
    () => ({
      ...(isSingle
        ? { sortField: state[0]?.field, sortOrder: state[0]?.order }
        : {
            multiSortMeta: state,
          }),
      onSort: e => {
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
      resetSort: () => setState(initialArray),
      query: qs.stringify(
        {
          sort: state.map(s => s.field),
          order: state.map(s => s.order),
        },
        { arrayFormat: "comma" },
      ),
    }),
    [state, mode],
  );
};

export default useTableSort;
