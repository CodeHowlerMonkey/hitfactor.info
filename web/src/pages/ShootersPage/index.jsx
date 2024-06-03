import { v4 as randomUUID } from "uuid";
import { useCallback, useEffect, useState } from "react";
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
import { useDebouncedCallback } from "use-debounce";

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
  const [classifiers, setClassifiers] = useState([]);
  useEffect(() => setClassifiers(apiData?.classifiers || []), [apiData?.classifiers]);
  const downloadUrl = `/api/shooters/download/${division}/${memberNumber}`;

  const refetchWhatIfs = (whatIfs) => {
    const canRefetch = whatIfs.length > 0 && whatIfs.every((c) => c.classifier && c.hf);
    if (canRefetch) {
      console.log(JSON.stringify(whatIfs, null, 2));
    }
  };
  const debouncedRefetchWhatIfs = useDebouncedCallback(refetchWhatIfs, 750);

  const addWhatIf = useCallback(() => {
    setClassifiers((existing) => [{ whatIf: randomUUID() }, ...existing]);
  });

  const updateWhatIfs = useCallback(
    (id, changes = {}) => {
      let isDelete = false;
      const whatIfClassifiers = classifiers
        .filter((c) => c.whatIf)
        .map((c) => {
          if (c.whatIf === id) {
            c = { ...c, ...changes };
          }

          if (c.delete) {
            isDelete = true;
            return null;
          }

          return c;
        })
        .filter(Boolean);

      if (isDelete) {
        setClassifiers([...whatIfClassifiers, ...(apiData?.classifiers || [])]);
        refetchWhatIfs(whatIfClassifiers);
      } else {
        debouncedRefetchWhatIfs(whatIfClassifiers);
      }
    },
    [classifiers]
  );

  return {
    ...apiData,
    info,
    classifiers,
    downloadUrl,
    loading,
    addWhatIf,
    updateWhatIfs,
  };
};

export const ShooterRunsAndInfo = ({ division, memberNumber, onBackToShooters }) => {
  const navigate = useNavigate();
  const { info, downloadUrl, addWhatIf, ...tableShit } = useShooterTableData({
    division,
    memberNumber,
  });
  const { loading } = tableShit;
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
      <ShooterInfoTable
        info={info}
        division={division}
        memberNumber={memberNumber}
        loading={loading}
      />

      <Divider />
      <div className="flex justify-content-between">
        <h4 className="block md:text-lg lg:text-xl">Scores</h4>
        <Button
          className="px-2 my-3 text-sm"
          label="What If"
          size="small"
          iconPos="left"
          icon="pi pi-plus-circle"
          onClick={addWhatIf}
        />
      </div>

      <ShooterRunsTable
        {...tableShit}
        onClassifierSelection={(number) => navigate(`/classifiers/${division}/${number}`)}
        onClubSelection={(club) => navigate("/clubs/" + club)}
      />
    </>
  );
};

export default ShootersPage;
