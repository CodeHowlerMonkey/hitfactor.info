import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";

const shooterHref = (memberNumber, division) =>
  `/shooters/${division}/${memberNumber || ""}`;
const classifierHref = (classifier, division) =>
  `/classifiers/${division}/${classifier || ""}`;

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
        <Message severity="error" text={error.toString?.() || error} className="m-4" />
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

export default UploadResults;
