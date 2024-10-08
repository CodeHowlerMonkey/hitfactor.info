import uniqBy from "lodash.uniqby";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { TabView, TabPanel } from "primereact/tabview";
import { ToggleButton } from "primereact/togglebutton";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

import { uuidsFromUrlString } from "../../../../shared/utils/uuid";
import { getApi, postApi } from "../../utils/client";


import UploadResults from "./UploadResults";
import USPSAUpload from "./USPSAUpload";

const shooterHref = (memberNumber, division) =>
  `/shooters/${division}/${memberNumber || ""}`;
const classifierHref = (classifier, division) =>
  `/classifiers/${division}/${classifier || ""}`;

const MatchSearchInput = forwardRef(({ placeholder, onChange }, ref) => {
  const inputRef = useRef();
  const [value, setValue] = useState("");
  const [debouncedValue] = useDebounce(value, 350);
  useEffect(() => {
    onChange?.(debouncedValue);
  }, [debouncedValue]);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const searchRef = useRef();
  const [searchResults, setSearchResults] = useState([]);
  const [toUpload, setToUpload] = useState(() => []);
  const toUploadIds = toUpload.map(m => m.uuid);

  const updateSearchResults = async q => {
    if (!q) {
      return;
    }
    const hits = await getApi(`/upload/searchMatches?q=${encodeURIComponent(q)}`);
    setSearchResults(hits);
  };

  const tableData = uniqBy([...toUpload, ...searchResults], c => c.uuid).map(c => ({
    ...c,
    upload: toUploadIds.includes(c.uuid),
    date: new Date(c.matchDate || c.created || c.updated)
      .toLocaleDateString()
      .split(" ")[0],
  }));

  return (
    <div className="p-0 md:px-4">
      <TabView panelContainerClassName="p-0 md:px-4">
        <TabPanel header="PractiScore" className="p-0 text-sm md:text-base">
          <div className="flex flex-column flex align-items-center mt-2">
            <div className="flex flex-column" style={{ width: "min(48rem, 90vw)" }}>
              <MatchSearchInput
                placeholder="Search Matches"
                onChange={updateSearchResults}
                ref={searchRef}
              />
              {tableData.length > 0 && (
                <DataTable
                  stripedRows
                  value={tableData}
                  size="small"
                  totalRecords={tableData.length}
                  sortField="upload"
                  sortOrder={1}
                  /*
                  rowGroupMode="subheader"
                  groupRowsBy="upload"
                  rowGroupHeaderTemplate={(data) => {
                    if (data.upload) {
                      return "To Upload";
                    }
                    return "Search Results";
                  }}
                    */
                >
                  <Column field="date" header="Date" />
                  <Column
                    header="Type"
                    body={({ templateName, type, subType }) => (
                      <span
                        title={[type, subType]
                          .filter(w => !!w && w !== "none")
                          .join(" / ")}
                      >
                        {templateName}
                      </span>
                    )}
                  />
                  <Column field="state" header="State" />
                  <Column
                    field="name"
                    style={{ width: "24em" }}
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
                    header="Uploaded"
                    body={match => {
                      if (match.uploaded) {
                        return (
                          <span>
                            <i className="pi pi-check mr-2 text-teal-500" />
                            {new Date(match.uploaded).toLocaleDateString()}
                          </span>
                        );
                      }

                      return (
                        <span
                          className="text-center ml-6"
                          title={`Check back in ${match.eta || 30} minutes.`}
                        >
                          Not yet
                        </span>
                      );

                      return null;
                    }}
                  />
                  <Column
                    hidden
                    header="Upload?"
                    body={match => (
                      <ToggleButton
                        className="p-2"
                        size="small"
                        onIcon="pi pi-check"
                        offIcon="pi pi-times"
                        checked={toUploadIds.includes(match.uuid)}
                        onChange={e =>
                          setToUpload(existing => {
                            const shouldBeUploaded = e.value;
                            if (shouldBeUploaded) {
                              return [...existing, match];
                            }
                            const index = existing.findIndex(c => c.uuid === match.uuid);
                            if (index >= 0) {
                              const newArray = [...existing];
                              newArray.splice(index, 1);
                              return newArray;
                            }

                            return existing;
                          })
                        }
                      />
                    )}
                  />
                </DataTable>
              )}
              {toUploadIds.length > 0 && (
                <div className="flex flex-grow-1 justify-content-center">
                  <Button
                    size="large"
                    className="m-4 md:text-4xl lg:text-base"
                    label="Upload  "
                    icon="pi pi-upload md:text-4xl md:pl-3 lg:text-base lg:p-0"
                    iconPos="right"
                    loading={loading}
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      setResult(null);
                      try {
                        const apiResponse = await postApi("/upload", {
                          uuids: toUploadIds,
                        });
                        if (apiResponse.error) {
                          setError(apiResponse.error);
                        } else {
                          setResult(apiResponse);
                          searchRef.current?.setValue("");
                          setToUpload([]);
                          setSearchResults([]);
                        }
                      } catch (e) {
                        setError(e);
                      }
                      setLoading(false);
                    }}
                  />
                </div>
              )}
              <UploadResults {...{ error, result, loading }} />
            </div>
          </div>
        </TabPanel>
        <TabPanel header="USPSA" className="p-0 text-sm md:text-base">
          <USPSAUpload />
        </TabPanel>
      </TabView>
    </div>
  );
};

// Keeping this around in case search dies beyond repair
const OldUploadPage = () => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  return (
    <div className="flex flex-column flex align-items-center mt-2">
      {!result && (
        <span className="mx-5 my-2">
          <p>
            Use{" "}
            <a href="https://practiscore.com/results" target="_blank" rel="noreferrer">
              PractiScore
            </a>{" "}
            to obtain the Scores URLs. If you have Competitor app - you can also use "Open
            in Browser" match option.
          </p>
          <p>
            Acceptable URLs must end in a UUID, and NOT a number.
            <br /> For example:
            {"  "}
            <code>
              https://practiscore.com/results/new/4ef54927-f807-4450-ac4e-d3132f70b301
            </code>
            <br />
            If you have a number URL - you can scroll down and click "Html Results".
          </p>
        </span>
      )}
      <div className="m-4">
        {loading && <ProgressSpinner />}
        {error && (
          <Message severity="error" text={error.toString?.() || error} className="m-4" />
        )}
        {result && (
          <Message severity="success" text="Upload Complete!" icon="pi pi-check" />
        )}
      </div>
      {result && (
        <div className="flex justify-content-around sm:w-full lg:w-10 mt-4">
          <div>
            Classifiers:
            <ul>
              {result.classifiers?.map(c => (
                <li key={c.classifierDivision}>
                  <a
                    href={classifierHref(c.classifier, c.division)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {c.classifier} - {c.division}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            Shooters:
            <ul>
              {result.shooters?.map(s => (
                <li key={s.memberNumberDivision}>
                  <a
                    href={shooterHref(s.memberNumber, s.division)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.memberNumber} - {s.division}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="sm:w-full sm:px-4 flex lg:w-full">
        <InputTextarea
          className="w-full lg:w-10 lg:text-base mx-auto sm:h-5rem"
          placeholder="PS Scores URLs"
          autoFocus
          disabled={loading}
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={12}
          cols={75}
        />
      </div>
      <Button
        size="large"
        className="m-4 md:text-4xl lg:text-base"
        label="Upload  "
        icon="pi pi-upload md:text-4xl md:pl-3 lg:text-base lg:p-0"
        iconPos="right"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          setResult(null);
          try {
            const apiResponse = await postApi("/upload", {
              uuids: uuidsFromUrlString(value),
            });
            if (apiResponse.error) {
              setError(apiResponse.error);
            } else {
              setValue("");
              setResult(apiResponse);
            }
          } catch (e) {
            setError(e);
          }
          setLoading(false);
        }}
      />
    </div>
  );
};

export default UploadPage;
