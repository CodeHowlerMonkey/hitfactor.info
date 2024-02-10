import { useCallback } from "react";
import { DivisionNav } from "./common";
import { useNavigate, useParams } from "react-router-dom";
import ClassifiersTable from "./ClassifiersTable";
import RunsTable from "./RunsTable";

// TODO: shooters table for single classifier? # attempts, low HF, high HF, same for percent, same for curPercent
// TODO: all classifiers total number of reshoots (non-uniqueness)

const Classifiers = () => {
  const navigate = useNavigate();
  const { division, classifier } = useParams();
  const onDivisionSelect = useCallback(
    (division) => navigate(`/classifiers/${division}/${classifier}`),
    [navigate]
  );
  const onBackToClassifiers = useCallback(
    () => navigate(`/classifiers/${division}`),
    [navigate]
  );

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
        <RunsTable
          division={division}
          classifier={classifier}
          onShooterSelection={(shooter) => navigate("/shooters/" + shooter)}
          onClubSelection={(club) => navigate("/clubs/" + club)}
          onBack={onBackToClassifiers}
        />
      )}
    </div>
  );
};

export default Classifiers;
