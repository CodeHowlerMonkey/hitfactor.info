import { useCallback } from "react";
import { DivisionNavigation } from "../../components";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import ClassifiersTable from "./components/ClassifiersTable";
import RunsTable, { useRunsTableData } from "../../components/RunsTable";
import ClassifierInfoTable from "./components/ClassifierInfoTable";
import { useApi } from "../../utils/client";

// TODO: shooters table for single classifier? # attempts, low HF, high HF, same for percent, same for curPercent
// TODO: all classifiers total number of reshoots (non-uniqueness)

const divisionsHaveSameClassifiers = (a, b) => {
  if (a.startsWith("scsa_") && !b.startsWith("scsa_")) {
    return false;
  }
  if (b.startsWith("scsa_") && !a.startsWith("scsa_")) {
    return false;
  }

  return true;
};

const ClassifiersPage = () => {
  const navigate = useNavigate();
  const { division, classifier } = useParams();
  const onDivisionSelect = useCallback(
    newDivision => {
      const newClassifier = divisionsHaveSameClassifiers(division || "", newDivision)
        ? classifier
        : "";
      navigate(`/classifiers/${newDivision}/${newClassifier || ""}`);
    },
    [navigate, division, classifier],
  );
  const onBackToClassifiers = useCallback(
    () => navigate(`/classifiers/${division}`),
    [navigate, division]
  );
  const onShooterSelection = (memberNumber) =>
    navigate(`/shooters/${division}/${memberNumber}`);

  const onClubSelection = (club) => navigate("/clubs/" + club);

  return (
    <div>
      <DivisionNavigation onSelect={onDivisionSelect} />
      <div style={{ maxWidth: 1280, margin: "auto" }}>
        {division && !classifier && (
          <ClassifiersTable
            division={division}
            onClassifierSelection={(classifierCode) => navigate("./" + classifierCode)}
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
    </div>
  );
};

export const useClassifierInfo = ({ division, classifier }) => {
  const apiEndpoint = !(division && classifier)
    ? null
    : `/classifiers/info/${division}/${classifier}`;
  const { json: apiData, loading } = useApi(apiEndpoint);
  const info = apiData?.info;
  const { hhfs, clubs } = info || {};

  return {
    loading,
    info,
    clubs,
    hhfs,
  };
};

export const ClassifierRunsAndInfo = ({
  division,
  classifier,
  onBackToClassifiers,
  onShooterSelection,
  onClubSelection,
}) => {
  const { loading, info, clubs, hhfs } = useClassifierInfo({ classifier, division });
  const { code, name } = info || {};

  return (
    <>
      <div className="flex justify-content-between">
        <Button
          className="text-sm md:text-lg lg:text-xl font-bold px-0 md:px-2"
          icon="pi pi-chevron-left"
          rounded
          text
          aria-label="Back"
          onClick={onBackToClassifiers}
        >
          Classifiers List
        </Button>
        <h2 className="mx-auto md:text-xl lg:text-xxl w-max">
          {code} {name}
        </h2>
        {/*<a href={downloadUrl} download className="px-5 py-2" style={{ fontSize: "1.625rem" }}>
          <i
            className="pi pi-download"
            style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#ae9ef1" }}
          />
        </a>*/}
      </div>
      <ClassifierInfoTable {...{ division, classifier, loading, hhfs }} {...info} />

      <RunsTable
        classifier={classifier}
        division={division}
        onShooterSelection={onShooterSelection}
        onClubSelection={onClubSelection}
        clubs={clubs}
      />
    </>
  );
};

export default ClassifiersPage;
