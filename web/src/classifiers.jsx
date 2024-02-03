import { useCallback } from "react";
import { DivisionNav } from "./common";
import { useNavigate, useParams } from "react-router-dom";
import ClassifiersTable from "./ClassifiersTable";

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
      {classifier && "classifier to render: " + classifier}
    </div>
  );
};

export default Classifiers;
