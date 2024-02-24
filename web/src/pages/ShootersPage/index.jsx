import { useCallback } from "react";
import { DivisionNavigation } from "../../components";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import ShootersTable from "./components/ShootersTable";
// import RunsTable, { useRunsTableData } from "../../components/ShootersTable";
import ShooterInfoTable from "./components/ShooterInfoTable";
import { useApi } from "../../utils/client";

// TODO: shooters table for single classifier? # attempts, low HF, high HF, same for percent, same for curPercent
// TODO: all classifiers total number of reshoots (non-uniqueness)

const ShootersPage = () => {
  const navigate = useNavigate();
  const { division, memberNumber } = useParams();
  const onDivisionSelect = useCallback(
    (division) => navigate(`/shooters/${division}/${memberNumber || ""}`),
    [navigate, division, memberNumber]
  );
  const onBackToShooters = useCallback(
    () => navigate(`/shooters/${division}`),
    [navigate, division]
  );

  return (
    <div className="mx-">
      <DivisionNavigation onSelect={onDivisionSelect} />
      {division && !memberNumber && (
        <ShootersTable
          division={division}
          onSelection={(memberNumber) => navigate("./" + memberNumber)}
        />
      )}
      {memberNumber && (
        <ShooterRunsAndInfo
          division={division}
          memberNumber={memberNumber}
          onBackToShooters={onBackToShooters}
        />
      )}
    </div>
  );
};

const useShooterTableData = ({ division, memberNumber }) => {
  const apiEndpoint = !(division && memberNumber)
    ? null
    : `/shooters/${division}/${memberNumber}`;
  const apiData = useApi(apiEndpoint);
  const info = apiData?.info || {};
  const classifiers = apiData?.classifiers || [];

  return { ...apiData, info, classifiers };
};

export const ShooterRunsAndInfo = ({
  division,
  memberNumber,
  onBackToShooters,
}) => {
  const { info } = useShooterTableData({
    division,
    memberNumber,
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
          onClick={onBackToShooters}
        >
          Shooters List
        </Button>
        <h1 style={{ margin: "auto" }}>
          {memberNumber} {name}
        </h1>
      </div>
      <div className="flex" style={{ height: "29rem", overflowY: "none" }}>
        <div className="w-full h-full bg-primary-reverse">
          <ShooterInfoTable info={info} />
        </div>
      </div>

      {/*
      <RunsTable
        {...useRunsTableDataResults}
        onClassifierSelection={(number) =>
          navigate(`/classifiers/${division}/${number}`)
        }
        onClubSelection={(club) => navigate("/clubs/" + club)}
      />
      */}
    </>
  );
};

export default ShootersPage;
