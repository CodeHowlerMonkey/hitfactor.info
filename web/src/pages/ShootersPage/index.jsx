import { v4 as randomUUID } from "uuid";
import { useCallback, useEffect, useState } from "react";
import { DivisionNavigation } from "../../components";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import ShootersTable from "./components/ShootersTable";
// import RunsTable, { useRunsTableData } from "../../components/ShootersTable";
import ShooterInfoTable from "./components/ShooterInfoTable";
import { postApi, useApi } from "../../utils/client";
import { divShortToLong } from "../../../../api/src/dataUtil/divisions";
import ShooterRunsTable from "./components/ShooterRunsTable";
import { Divider } from "primereact/divider";
import { useDebouncedCallback } from "use-debounce";
import { renderPercent } from "../../components/Table";

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
  const [lastFetchedClassifiers, setLastFetchedClassifiers] = useState([]);
  useEffect(() => {
    const classifiersFromApiData = apiData?.classifiers || [];
    setClassifiers(classifiersFromApiData);
    setLastFetchedClassifiers(classifiersFromApiData);
  }, [apiData?.classifiers]);

  const downloadUrl = `/api/shooters/download/${division}/${memberNumber}`;

  const refetchWhatIfs = async (whatIfs) => {
    const canRefetch =
      whatIfs.length > 0 && whatIfs.every((c) => !c.whatIf || (c.classifier && c.hf));
    if (canRefetch) {
      const result = await postApi("/upload/whatif", {
        scores: whatIfs,
        division,
        memberNumber,
      });
      setClassifiers(result.scores);
      setWhatIf(result.whatIf);
      // console.log(JSON.stringify({ result }, null, 2));
    }
  };
  const debouncedRefetchWhatIfs = useDebouncedCallback(refetchWhatIfs, 500);

  const [whatIf, setWhatIf] = useState(null);
  const resetWhatIfs = useCallback(() => {
    setWhatIf(null);
    setClassifiers(lastFetchedClassifiers);
  }, [setWhatIf, setClassifiers, lastFetchedClassifiers]);

  useEffect(() => {
    setWhatIf(null);
  }, [division, memberNumber]);

  const addWhatIf = useCallback(() => {
    setWhatIf(
      (prevWhatIf) =>
        prevWhatIf ?? {
          recPercent: info?.reclassificationsRecPercentCurrent || -1,
          curPercent: info?.reclassificationsCurPercentCurrent || -1,
        }
    );
    setClassifiers((existing) => {
      const result = [
        { _id: randomUUID(), whatIf: true, sd: new Date().toISOString() },
        ...existing,
      ];
      return result;
    });
  });

  const updateWhatIfs = useCallback(
    (id, changes = {}, noDebounce = false) => {
      let isDelete = false;
      const whatIfClassifiers = classifiers
        .map((c) => {
          if (c._id === id) {
            for (const key of Object.keys(changes)) {
              const value = changes[key];
              c[key] = value;
            }

            if (c.delete) {
              isDelete = true;
              return null;
            }
          }

          return c;
        })
        .filter(Boolean);

      setClassifiers(whatIfClassifiers);
      if (noDebounce) {
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
    whatIf,
    addWhatIf,
    updateWhatIfs,
    resetWhatIfs,
  };
};

export const ShooterRunsAndInfo = ({ division, memberNumber, onBackToShooters }) => {
  const navigate = useNavigate();
  const { info, downloadUrl, addWhatIf, resetWhatIfs, ...tableShit } =
    useShooterTableData({
      division,
      memberNumber,
    });
  const { loading, whatIf } = tableShit;
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
        {whatIf && (
          <div className="m-auto">
            <h5 className="block md:inline mr-4">
              Recommended: {renderPercent(whatIf, { field: "recPercent" })}
            </h5>
            <h5 className="block md:inline">
              Current HHF: {renderPercent(whatIf, { field: "curPercent" })}
            </h5>
          </div>
        )}
        <div>
          {whatIf && (
            <Button
              className="px-2 my-3 mr-2 text-xs md:text-sm"
              label="Reset"
              size="small"
              iconPos="left"
              icon="pi pi-refresh text-xs md:text-base"
              onClick={resetWhatIfs}
            />
          )}
          <Button
            className="px-2 my-3 text-xs md:text-sm"
            label="What If"
            size="small"
            iconPos="left"
            icon="pi pi-plus-circle text-xs md:text-base"
            onClick={addWhatIf}
          />
        </div>
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
