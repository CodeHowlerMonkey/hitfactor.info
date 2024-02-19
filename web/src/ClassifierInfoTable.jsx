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
      scrollable={false}
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
        bodyStyle={{ padding: 0 }}
        body={() => (
          <div className="h-full w-full" style={{ overflowY: "scroll" }}>
            <DataTable showHeaders={false} stripedRows value={info.hhfs}>
              <Column field="hhf" />
              <Column
                field="date"
                body={(c) => new Date(c.date).toLocaleDateString()}
              />
            </DataTable>
          </div>
        )}
      />
    </DataTable>
  );
};

export default ClassifierInfoTable;
