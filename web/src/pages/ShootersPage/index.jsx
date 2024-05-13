import { useCallback } from "react";
import { DivisionNavigation } from "../../components";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import ShootersTable from "./components/ShootersTable";
// import RunsTable, { useRunsTableData } from "../../components/ShootersTable";
import ShooterInfoTable from "./components/ShooterInfoTable";
import { useApi } from "../../utils/client";
import { divShortToLong } from "../../../../api/src/dataUtil/divisions";
import ShooterRunsTable from "./components/ShooterRunsTable";
import { Divider } from "primereact/divider";

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
    <div>
      <DivisionNavigation onSelect={onDivisionSelect} />
      <div style={{ maxWidth: 1280, margin: "auto" }}>
        {division && !memberNumber && (
          <ShootersTable
            division={division}
            onShooterSelection={(memberNumber) => navigate("./" + memberNumber)}
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
    </div>
  );
};

const useShooterTableData = ({ division, memberNumber }) => {
  const apiEndpoint = !(division && memberNumber)
    ? null
    : `/shooters/${division}/${memberNumber}`;
  const { json: apiData, loading } = useApi(apiEndpoint);
  const info = apiData?.info || {};
  const classifiers = apiData?.classifiers || [];
  const downloadUrl = `/api/shooters/download/${division}/${memberNumber}`;

  return { ...apiData, info, classifiers, downloadUrl, loading };
};

export const ShooterRunsAndInfo = ({ division, memberNumber, onBackToShooters }) => {
  const navigate = useNavigate();
  const { info, downloadUrl, ...tableShit } = useShooterTableData({
    division,
    memberNumber,
  });

  const { name } = info;

  return (
    <>
      <div className="flex justify-content-between flex-wrap">
        <Button
          className="text-sm md:text-lg lg:text-xl font-bold px-0 md:px-2"
          icon="pi pi-chevron-left text-sm md:text-lg lg:text-xl "
          rounded
          text
          aria-label="Back"
          onClick={onBackToShooters}
        >
          Shooters List
        </Button>
        <h4 className="m-auto md:hidden">
          {memberNumber} - {name} - {divShortToLong[division]}
        </h4>
      </div>
      <ShooterInfoTable info={info} division={division} memberNumber={memberNumber} />

      <Divider />
      <h4 className="md:text-lg lg:text-xl">Scores</h4>

      <ShooterRunsTable
        {...tableShit}
        onClassifierSelection={(number) => navigate(`/classifiers/${division}/${number}`)}
        onClubSelection={(club) => navigate("/clubs/" + club)}
      />
    </>
  );
};

export default ShootersPage;
