import { useCallback } from "react";
import { DivisionNav } from "./common";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import ClassifiersTable from "./ClassifiersTable";
import RunsTable, { useRunsTableData } from "./RunsTable";
import ScoresChart from "./ScoresChart";

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

  const useRunsTableDataResults = useRunsTableData({ division, classifier });
  const { code, name, hhf } = useRunsTableDataResults;

  return (
    <div className="mx-">
      <DivisionNav onSelect={onDivisionSelect} />
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
        />
      )}
    </div>
  );
};

export const ClassifierRunsAndInfo = ({
  division,
  classifier,
  onBackToClassifiers,
}) => {
  const useRunsTableDataResults = useRunsTableData({ division, classifier });
  const { code, name, hhf } = useRunsTableDataResults;

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
      </div>
      <div className="flex h-30rem">
        <div className="w-full h-full bg-primary-reverse">
          <ScoresChart division={division} classifier={classifier} hhf={hhf} />
        </div>
        <div className="w-full h-full bg-primary" />
        <div className="w-full h-full bg-primary-reverse" />
      </div>
      <div className="flex h-20rem"></div>

      <RunsTable
        {...useRunsTableDataResults}
        onShooterSelection={(shooter) => navigate("/shooters/" + shooter)}
        onClubSelection={(club) => navigate("/clubs/" + club)}
        onBack={onBackToClassifiers}
      />
    </>
  );
};

export default ClassifiersPage;
