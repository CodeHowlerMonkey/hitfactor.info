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
  );
};

const useShooterTableData = ({ division, memberNumber }) => {
  const apiEndpoint = !(division && memberNumber)
    ? null
    : `/shooters/${division}/${memberNumber}`;
  const apiData = useApi(apiEndpoint);
  const info = apiData?.info || {};
  const classifiers = apiData?.classifiers || [];
  const downloadUrl = `/api/shooters/download/${division}/${memberNumber}`;

  return { ...apiData, info, classifiers, downloadUrl };
};

export const ShooterRunsAndInfo = ({
  division,
  memberNumber,
  onBackToShooters,
}) => {
  const navigate = useNavigate();
  const { info, downloadUrl, ...tableShit } = useShooterTableData({
    division,
    memberNumber,
  });

  const { name } = info;

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
          {memberNumber} - {name} - {divShortToLong[division]}
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
      <div className="flex h-32rem" style={{ overflowY: "none" }}>
        <div className="w-full h-full bg-primary-reverse">
          <ShooterInfoTable info={info} />
        </div>
      </div>

      <ShooterRunsTable
        {...tableShit}
        onClassifierSelection={(number) =>
          navigate(`/classifiers/${division}/${number}`)
        }
        onClubSelection={(club) => navigate("/clubs/" + club)}
      />
    </>
  );
};

export default ShootersPage;
