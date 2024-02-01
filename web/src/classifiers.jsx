import { useCallback, useState } from "react";
import { DataTable } from "primereact/datatable";
import { ColumnGroup } from "primereact/columngroup";
import { InputText } from "primereact/inputtext";
import { Row } from "primereact/row";
import { Column } from "primereact/column";
import { DivisionNav } from "./common";
import { Link, useNavigate, useParams } from "react-router-dom";
import Table from "./ClassifiersTable";
import { useApi } from "./client";

const fullCodeNum = (code) =>
  Number(((code.startsWith("99") ? "19" : "20") + code).replace("-", ""));

const numSort = (a, b, field, order) => order * (a[field] - b[field]);

const stringSort = (a, b, field, order) => {
  if (a[field].toLowerCase() > b[field].toLowerCase()) {
    return order;
  } else {
    return -order;
  }
};

const dateSort = (a, b, field, order) => {
  return order * (new Date(a[field]).getTime() - new Date(b[field]).getTime());
};

const ClassifiersTable = ({ division }) => {
  const navigate = useNavigate();
  const [sortState, setSortState] = useState({
    sortField: null,
    sortOrder: null,
  });
  const [filter, setFilter] = useState("");

  const data = (useApi("/classifiers/" + (division ?? "")) ?? [])
    .map((d) => ({
      ...d,
      updated: new Date(d.updated).toLocaleDateString(),
    }))
    .sort((a, b) => {
      switch (sortState.sortField) {
        case "code":
          return (
            sortState.sortOrder * (fullCodeNum(a.code) - fullCodeNum(b.code))
          );
        case "updated":
          return dateSort(a, b, sortState.sortField, sortState.sortOrder);

        default:
          if (typeof a[sortState.sortField] === "string") {
            return stringSort(a, b, sortState.sortField, sortState.sortOrder);
          } else {
            return numSort(a, b, sortState.sortField, sortState.sortOrder);
          }
      }
    })
    .filter(
      (cur) =>
        !filter ||
        (cur.code + "###" + cur.name)
          .toLowerCase()
          .includes(filter.toLowerCase())
    );

  return (
    <DataTable
      selectionMode={"single"}
      selection={null}
      onSelectionChange={({ value }) => navigate("./" + value.code)}
      stripedRows
      header={
        <div className="flex justify-content-end">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search"
            />
          </span>
        </div>
      }
      lazy
      value={data ?? []}
      tableStyle={{ minWidth: "50rem" }}
      removableSort
      onSort={({ sortField, sortOrder }) => {
        setSortState({ sortField, sortOrder });
        console.log(JSON.stringify({ sortField, sortOrder }));
      }}
      {...sortState}
    >
      <Column field="code" header="Number" sortable />
      <Column field="name" header="Name" sortable />
      <Column field="hhf" header="HHF" sortable />
      <Column
        field="top1PercentileCurPercent"
        header={
          <>
            1<sup>th</sup>%
          </>
        }
        sortable
      />
      <Column
        field="top2PercentileCurPercent"
        header={
          <>
            2<sup>th</sup>%
          </>
        }
        sortable
      />
      <Column
        field="top5PercentileCurPercent"
        header={
          <>
            5<sup>th</sup>%
          </>
        }
        sortable
      />

      <Column field="runsGM" header="GM Runs" sortable />
      <Column field="runsLegitGM" header="Cur HHF GM Runs" sortable />
      <Column field="runsHundo" header="Hundos" sortable />
      <Column field="runsLegitHundo" header="Cur HHF Hundos" sortable />

      <Column field="scoring" header="Scoring" sortable />
      <Column field="updated" header="Updated" dataType="date" sortable />
    </DataTable>
  );
};

const Classifiers = () => {
  const navigate = useNavigate();
  const onDivisionSelect = useCallback(
    (division) => navigate(`/classifiers/${division ?? ""}`),
    [navigate]
  );
  const { division, classifier } = useParams();

  return (
    <div className="mx-">
      <DivisionNav onSelect={onDivisionSelect} />
      {division && !classifier && <ClassifiersTable division={division} />}
      {classifier && "classifier to render: " + classifier}
    </div>
  );
};

// TODO: TimeLine component for historical HHFs

export default Classifiers;
