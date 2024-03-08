import { useCallback } from "react";
import { DivisionNavigation } from "../../components";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import ClassifiersTable from "./components/ClassifiersTable";
import RunsTable, { useRunsTableData } from "../../components/RunsTable";
import ClassifierInfoTable from "./components/ClassifierInfoTable";

// TODO: shooters table for single classifier? # attempts, low HF, high HF, same for percent, same for curPercent
// TODO: all classifiers total number of reshoots (non-uniqueness)

const ClassifiersPage = () => {
  const navigate = useNavigate();
  const { division, classifier } = useParams();
  const onDivisionSelect = useCallback(
    (division) => navigate(`/classifiers/${division}/${classifier || ""}`),
    [navigate, division, classifier]
  );
  const onBackToClassifiers = useCallback(
    () => navigate(`/classifiers/${division}`),
    [navigate, division]
  );
  const onShooterSelection = (memberNumber) =>
    navigate(`/shooters/${division}/${memberNumber}`);

  const onClubSelection = (club) => navigate("/clubs/" + club);

  return (
    <div className="mx-">
      <DivisionNavigation onSelect={onDivisionSelect} />
      {division && !classifier && (
        <ClassifiersTable
          division={division}
          onClassifierSelection={(classifierCode) =>
            navigate("./" + classifierCode)
          }
        />
      )}
      {classifier && (
        <ClassifierRunsAndInfo
          division={division}
          classifier={classifier}
          onBackToClassifiers={onBackToClassifiers}
          onShooterSelection={onShooterSelection}
          onClubSelection={onClubSelection}
        />
      )}
    </div>
  );
};

export const ClassifierRunsAndInfo = ({
  division,
  classifier,
  onBackToClassifiers,
  onShooterSelection,
  onClubSelection,
}) => {
  const { info, downloadUrl, ...useRunsTableDataResults } = useRunsTableData({
    division,
    classifier,
  });
  const { code, name, hhf } = info;

  return (
    <>
      <div className="flex justify-content-between">
        <Button
          style={{ fontSize: "1.2rem", fontWeight: "bold" }}
          icon="pi pi-chevron-left"
          rounded
          text
          aria-label="Back"
          onClick={onBackToClassifiers}
        >
          Classifiers List
        </Button>
        <h1 style={{ margin: "auto" }}>
          {code} {name}
        </h1>
        <a
          href={downloadUrl}
          download
          className="px-5 py-2"
          style={{ fontSize: "1.625rem" }}
        >
          <i
            className="pi pi-download"
            style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#ae9ef1" }}
          />
        </a>
      </div>
      <div className="flex" style={{ height: "35rem" }}>
        <div className="w-full h-full bg-primary-reverse">
          <ClassifierInfoTable {...{ division, classifier }} {...info} />
        </div>
      </div>

      <RunsTable
        {...useRunsTableDataResults}
        onShooterSelection={onShooterSelection}
        onClubSelection={onClubSelection}
      />
    </>
  );
};

export default ClassifiersPage;
