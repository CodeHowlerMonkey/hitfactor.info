import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";

const shooterHref = (memberNumber, division) =>
  `/shooters/${division}/${memberNumber || ""}`;
const classifierHref = (classifier, division) =>
  `/classifiers/${division}/${classifier || ""}`;

const errorContent = (error) => {
  const errorString = error.toString?.() || error;
  return (
    <div className="text-center">
      {errorString.split("\n").map((s) => (
        <p key={s}>{s}</p>
      ))}
    </div>
  );
};

const UploadResults = ({
  result,
  loading,
  error,
  successMessage = "Upload Complete!",
}) => {
  return (
    <>
      {loading && <ProgressSpinner />}
      {error && (
        <>
          <Message
            severity="error"
            content={errorContent(error)}
            className="my-4 -mx-4"
          />
        </>
      )}
      {result && (
        <Message
          severity="success"
          text={successMessage}
          icon="pi pi-check"
          className="m-4"
        />
      )}
      {result && (
        <div className="flex justify-content-around sm:w-full lg:w-10 mt-4">
          <div>
            Classifiers:
            <ul>
              {result.classifiers?.map((c) => (
                <li key={[c.classifier, c.division].join(":")}>
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
                <li key={[s.memberNumber, s.division].join(":")}>
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

export default UploadResults;
