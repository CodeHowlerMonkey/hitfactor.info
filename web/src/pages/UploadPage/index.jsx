import uniqBy from "lodash.uniqby";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

import { getApi } from "../../utils/client";

const DateText = ({ dateString, className }) => {
  const date = new Date(dateString);
  const isValid = !Number.isNaN(date.getTime());

  if (!isValid) {
    return <div className="text-right text-color-secondary">N/A</div>;
  }

  return (
    <div className={`text-right ${className}`}>
      <div>{date.toLocaleDateString()}</div>
      <div>
        {date.toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
};

const MatchSearchInput = forwardRef(({ placeholder, onChange }, ref) => {
  const inputRef = useRef();
  const [value, setValue] = useState("");
  const [debouncedValue] = useDebounce(value, 350);
  useEffect(() => {
    onChange?.(debouncedValue);
  }, [debouncedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(
    ref,
    () => ({
      setValue,
    }),
    [setValue],
  );

  return (
    <span className="flex relative p-input-icon-left w-12">
      <i className="pi pi-search" />
      <InputText
        className="flex-grow-1"
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <span
        onClick={() => {
          setValue("");
          inputRef.current?.focus();
        }}
        className="absolute right-0 top-50"
        style={{
          top: "50%",
          marginTop: "-0.5rem",
          width: "1rem",
          height: "1rem",
          textAlign: "center",
          lineHeight: "1rem",
          cursor: "pointer",
          fontSize: "1.25rem",
          marginRight: "14px",
          color: "rgba(255, 255, 255, 0.6)",
        }}
      >
        &#10005;
      </span>
    </span>
  );
});

const UploadPage = () => {
  const searchRef = useRef();
  const [searchResults, setSearchResults] = useState([]);

  const updateSearchResults = async q => {
    if (!q) {
      return;
    }
    const hits = await getApi(`/upload/searchMatches?q=${encodeURIComponent(q)}`);
    setSearchResults(hits);
  };

  const tableData = uniqBy(searchResults, c => c.uuid).map(c => ({
    ...c,
    date: c.matchDate || c.created || c.updated,
    sort: new Date(c.uploaded || c.updated || c.matchDate || c.created).getTime() || 0,
    uploadedAfterUpdated:
      new Date(c.uploaded).getTime() >=
      new Date(c.updated || c.created || c.matchDate).getTime(),
  }));

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-2">
        <div className="flex flex-column" style={{ width: "min(64rem, 90vw)" }}>
          <MatchSearchInput
            placeholder="Search Matches"
            onChange={updateSearchResults}
            ref={searchRef}
          />
          {!tableData.length ? (
            <div className="text-center mt-2 text-color-secondary">
              Search for a match name to check its upload status
            </div>
          ) : (
            <DataTable
              stripedRows
              value={tableData}
              size="small"
              totalRecords={tableData.length}
              sortField="sort"
              sortOrder={-1}
            >
              <Column
                header="Type"
                style={{ verticalAlign: "baseline" }}
                body={({ templateName, type, subType }) => (
                  <span
                    title={[type, subType].filter(w => !!w && w !== "none").join(" / ")}
                  >
                    {templateName}
                  </span>
                )}
              />
              <Column
                field="state"
                header="State"
                style={{ verticalAlign: "baseline" }}
              />
              <Column
                field="name"
                style={{ width: "24em", verticalAlign: "baseline" }}
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
                field="scoresCount"
                header="# of Scores"
                align="right"
                style={{ verticalAlign: "baseline" }}
              />
              <Column
                header="Created"
                body={match => <DateText dateString={match.created} />}
              />
              <Column
                header="Updated"
                body={match => <DateText dateString={match.updated} />}
              />
              <Column
                header="Uploaded"
                body={match => (
                  <DateText
                    dateString={match.uploaded}
                    className={match.uploadedAfterUpdated ? "text-green-400" : ""}
                  />
                )}
              />
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
