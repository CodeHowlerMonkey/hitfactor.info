import uniqBy from "lodash.uniqby";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { mapDivisionsFlat } from "../../../../shared/constants/divisions";
import { renderMatchLevel } from "../../components/Table";
import useApiQuery from "../../query/useApiQuery";
import useSearchParamState from "../../utils/useSearchParamState";

const MatchBumpMatches = () => {
  const { json: searchResults, loading } = useApiQuery(`/upload/matchBumpMatches`, {
    staleTime: 30 * 60 * 1000, // 30 mins
  });

  const tableData = useMemo(
    () =>
      uniqBy(searchResults, c => c.uuid).map(c => ({
        ...c,
        date: c.date || new Date(c.created || c.updated).toDateString(),
        sort: new Date(c.date || c.updated || c.created).getTime() || 0,
      })),
    [searchResults],
  );

  const [matchLevels, setMatchLevels] = useSearchParamState("lvl", "2.3.4");
  const items = [
    { label: "IV", value: 4 },
    { label: "III", value: 3 },
    { label: "II", value: 2 },
    { label: "I", value: 1 },
  ].reverse();

  const filteredTableData = useMemo(
    () => tableData.filter(c => matchLevels.split(".").map(Number).includes(c.level)),
    [matchLevels, tableData],
  );

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-2">
        <div className="card flex justify-content-center">
          <SelectButton
            className="compact text-xs"
            value={matchLevels
              .split(".")
              .map(Number)
              .filter(c => [1, 2, 3, 4].includes(c))}
            onChange={e => setMatchLevels(e.value.join("."))}
            optionLabel="label"
            options={items}
            multiple
          />
        </div>
        <div className="flex flex-column" style={{ width: "min(64rem, 90vw)" }}>
          {!tableData.length ? (
            loading ? (
              <div className="w-full flex justify-content-center">
                <ProgressSpinner />
              </div>
            ) : (
              <div className="text-center mt-2 text-color-secondary">Nothing Found</div>
            )
          ) : (
            <DataTable
              stripedRows
              value={filteredTableData}
              size="small"
              totalRecords={tableData.length}
              sortField="sort"
              sortOrder={-1}
            >
              <Column
                field="date"
                header="Date"
                style={{ minWidth: "8em", verticalAlign: "baseline" }}
              />
              <Column
                field="level"
                header="Level"
                align="center"
                style={{ verticalAlign: "baseline" }}
                body={renderMatchLevel}
              />
              <Column
                field="name"
                style={{ minWidth: "24em", verticalAlign: "baseline" }}
                header="Match"
                body={match => (
                  <a
                    href={`https://practiscore.com/results/new/${match.uuid}`}
                    target="_blank"
                    style={{
                      color: "unset",
                      textUnderlineOffset: "0.2em",
                      textDecorationColor: "rgba(255,255,255,0.5)",
                    }}
                    rel="noreferrer"
                  >
                    {match.name}
                  </a>
                )}
              />
              <Column
                field="divisions"
                header="Divisions"
                align="center"
                style={{ verticalAlign: "baseline" }}
                body={match => {
                  const divisions = mapDivisionsFlat(div =>
                    match[div] ? div : "",
                  ).filter(Boolean);

                  return divisions.map(division => (
                    <Link
                      className="m-1 weight-normal"
                      key={division}
                      to={`/upload/${match.uuid}/${division}`}
                    >
                      {division}
                    </Link>
                  ));
                }}
              />
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchBumpMatches;
