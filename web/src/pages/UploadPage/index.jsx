import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { ProgressSpinner } from "primereact/progressspinner";
import { getApi, postApi } from "../../utils/client";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { useDebounce } from "use-debounce";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ToggleButton } from "primereact/togglebutton";
import uniqBy from "lodash.uniqby";
import { uuidsFromUrlString } from "../../../../shared/utils/uuid";

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
    [setValue]
  );

  return (
    <span className="flex relative p-input-icon-left w-12">
      <i className="pi pi-search" />
      <InputText
        className="flex-grow-1"
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
  const toUploadIds = toUpload.map((m) => m.uuid);

  const updateSearchResults = async (q) => {
    if (!q) {
      return;
    }
    const hits = await getApi("/upload/searchMatches?q=" + encodeURIComponent(q));
    setSearchResults(hits);
  };

  const tableData = uniqBy([...toUpload, ...searchResults], (c) => c.uuid).map((c) => ({
    ...c,
    upload: toUploadIds.includes(c.uuid),
  }));

  return (
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
            rowGroupMode="subheader"
            groupRowsBy="upload"
            value={tableData}
            size="small"
            totalRecords={tableData.length}
            sortField="upload"
            sortOrder={1}
            rowGroupHeaderTemplate={(data) => {
              if (data.upload) {
                return "To Upload";
              }
              return "Search Results";
            }}
          >
            <Column field="date" header="Date" />
            <Column field="state" header="State" />
            <Column field="name" header="Match Name" />
            <Column
              header="Upload?"
              body={(match) => (
                <ToggleButton
                  className="p-2"
                  size="small"
                  onIcon="pi pi-check"
                  offIcon="pi pi-times"
                  checked={toUploadIds.includes(match.uuid)}
                  onChange={(e) =>
                    setToUpload((existing) => {
                      const shouldBeUploaded = e.value;
                      if (shouldBeUploaded) {
                        return [...existing, match];
                      } else {
                        const index = existing.findIndex((c) => c.uuid === match.uuid);
                        if (index >= 0) {
                          const newArray = [...existing];
                          newArray.splice(index, 1);
                          return newArray;
                        }
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
                  console.log(apiResponse);
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
  );
};

const UploadResults = ({ result, loading, error }) => {
  return (
    <>
      {loading && <ProgressSpinner />}
      {error && (
        <Message severity="error" text={error.toString?.() || error} className="m-4" />
      )}
      {result && (
        <Message
          severity="success"
          text="Upload Complete!"
          icon="pi pi-check"
          className="m-4"
        />
      )}
      {result && (
        <div className="flex justify-content-around sm: w-full lg:w-10 mt-4">
          <div>
            Classifiers:
            <ul>
              {result.classifiers?.map((c) => (
                <li>
                  <a href={classifierHref(c.classifier, c.division)} target="_blank">
                    {c.classifier} - {c.division}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            Shooters:
            <ul>
              {result.shooters?.map((s) => (
                <li>
                  <a href={shooterHref(s.memberNumber, s.division)} target="_blank">
                    {s.memberNumber} - {s.division}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
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
            <a href="https://practiscore.com/results" target="_blank">
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
        <div className="flex justify-content-around sm: w-full lg:w-10 mt-4">
          <div>
            Classifiers:
            <ul>
              {result.classifiers?.map((c) => (
                <li key={c.classifierDivision}>
                  <a href={classifierHref(c.classifier, c.division)} target="_blank">
                    {c.classifier} - {c.division}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            Shooters:
            <ul>
              {result.shooters?.map((s) => (
                <li key={s.memberNumberDivision}>
                  <a href={shooterHref(s.memberNumber, s.division)} target="_blank">
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
          onChange={(e) => setValue(e.target.value)}
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
            console.log(apiResponse);
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
