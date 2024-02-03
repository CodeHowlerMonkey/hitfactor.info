import { useCallback } from "react";
import { DivisionNav } from "./common";
import { useNavigate, useParams } from "react-router-dom";
import ClassifiersTable from "./ClassifiersTable";
import RunsTable from "./RunsTable";

const Classifiers = () => {
  const navigate = useNavigate();
  const onDivisionSelect = useCallback(
    (division) => navigate(`/classifiers/${division ?? ""}`),
    [navigate]
  );
  const { division, classifier } = useParams();

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
        />
      )}
    </div>
  );
};

export default Classifiers;
