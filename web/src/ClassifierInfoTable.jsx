import _ from "lodash";
import qs from "query-string";
import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "./client";
import useTableSort from "./common/useTableSort";
import useTablePagination from "./common/useTablePagination";
import { Dropdown } from "primereact/dropdown";
import { useDebounce } from "use-debounce";
import { bgColorForClass, fgColorForClass } from "./utils/color";
import ScoresChart from "./ScoresChart";

export const ClassifierInfoTable = ({ division, classifier, hhf, ...info }) => {
  // TODO: sort no page

  return (
    <DataTable
      style={{ height: "100%" }}
      tableStyle={{ height: "100%" }}
      value={[{ test: 1, test2: 2, test3: 3 }]}
      //      tableStyle={{ minWidth: "50rem" }}
    >
      <Column
        field="test"
        header="Scores Distribution"
        bodyStyle={{ position: "relative", padding: 0 }}
        body={() => (
          <ScoresChart division={division} classifier={classifier} hhf={hhf} />
        )}
      />
      <Column
        field="test"
        header="Stats"
        body={() => (
          <>
            <DataTable stripedRows value={[info]}>
              <Column field="runsD" header="D" />
              <Column field="runsC" header="C" />
              <Column field="runsB" header="B" />
              <Column field="runsA" header="A" />
              <Column field="runsM" header="M" />
              <Column field="runsGM" header="GM" />
              <Column field="runsHundo" header="Hundo" />
            </DataTable>
            <DataTable
              stripedRows
              value={[{ test: 1, test2: 2, test3: 3 }, { test: 2 }]}
            >
              <Column field="test" header="HHF" />
              <Column field="test2" header="Date" />
            </DataTable>
          </>
        )}
      />
      <Column
        field="test2"
        header="Historical HHFs"
        body={() => (
          <DataTable
            stripedRows
            value={[{ test: 1, test2: 2, test3: 3 }, { test: 2 }]}
          >
            <Column field="test" header="HHF" />
            <Column field="test2" header="Date" />
          </DataTable>
        )}
      />
    </DataTable>
  );
};

export default ClassifierInfoTable;
