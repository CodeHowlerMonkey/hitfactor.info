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
        bodyStyle={{ position: "relative", padding: 0, width: "46%" }}
        body={() => (
          <ScoresChart division={division} classifier={classifier} hhf={hhf} />
        )}
      />
      <Column
        field="test"
        header="WSB"
        bodyStyle={{ width: "27%", minWidth: "320px" }}
        body={() => (
          <div
            onClick={() => window.open(`/wsb/${classifier}`, "_blank")}
            style={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              backgroundColor: "clear",
              backgroundImage: `url(/wsb/${classifier}?preview=1)`,
              backgroundSize: "auto 100%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "top center",
            }}
          />
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
