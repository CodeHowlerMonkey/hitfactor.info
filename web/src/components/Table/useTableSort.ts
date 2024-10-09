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

interface PrimeTableSortState {
  sortField: string;
  sortOrder: 1 | -1;
}

// TODO: check that multisort types are right and it's working
type PrimeTableSortEvent = PrimeTableSortState & {
  multiSortMeta: SingleSortState[];
};

export const useTableSort = ({
  mode = "single",
  onSortCallback,
  initial = [] as SingleSortState[],
}: UseTableSortArgs) => {
  const initialArray = ([] as SingleSortState[]).concat(initial) as SingleSortState[];
  const [state, setState] = useState<SingleSortState[]>(initialArray);
  const isSingle = mode === "single";

  return useMemo(
    () => ({
      ...(isSingle
        ? { sortField: state[0]?.field, sortOrder: state[0]?.order }
        : {
            multiSortMeta: state,
          }),
      onSort: (e: PrimeTableSortEvent) => {
        if (isSingle) {
          const { sortField, sortOrder } = e as PrimeTableSortState;
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
    [state, mode], //eslint-disable-line react-hooks/exhaustive-deps
  );
};

export default useTableSort;
