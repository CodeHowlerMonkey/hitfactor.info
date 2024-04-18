import { useState } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { ProgressSpinner } from "primereact/progressspinner";
import { postApi } from "../../utils/client";
import { Message } from "primereact/message";

const uuidsFromUrlString = (str) =>
  str.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12})/gi);

const shooterHref = (memberNumber, division) => `/shooters/${division}/${memberNumber || ""}`;
const classifierHref = (classifier, division) => `/classifiers/${division}/${classifier || ""}`;
const UploadPage = () => {
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
            to obtain the Scores URLs. If you have Competitor app - you can also use "Open in
            Browser" match option.
          </p>
          <p>
            Acceptable URLs must end in a UUID, and NOT a number.
            <br /> For example:
            {"  "}
            <code>https://practiscore.com/results/new/4ef54927-f807-4450-ac4e-d3132f70b301</code>
            <br />
            If you have a number URL - you can scroll down and click "Html Results".
          </p>
        </span>
      )}
      {loading && <ProgressSpinner />}
      {error && <Message severity="error" text={error.toString?.() || error} className="m-4" />}
      {result && <Message severity="success" text="Upload Complete!" icon="pi pi-check" />}
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
            const apiResponse = await postApi("/upload", { uuids: uuidsFromUrlString(value) });
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
