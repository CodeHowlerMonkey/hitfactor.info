import { Button } from "primereact/button";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { DivisionNavigation } from "../../components";
import MatchBumpChart from "../../components/chart/MatchBumpChart";
import { useApi } from "../../utils/client";
import useSearchParamState from "../../utils/useSearchParamState";

import SearchUploads from "./SearchUploads";

const MatchPage = ({ uuid }) => {
  const { json: match, loading } = useApi(`/upload/${uuid}`);
  const [q] = useSearchParamState("q", "");
  const navigate = useNavigate();
  const { division } = useParams();
  const onDivisionSelect = useCallback(
    newDivision => {
      navigate(`/upload/${uuid}/${newDivision || ""}?q=${q}`);
    },
    [navigate, uuid, q],
  );

  return (
    <div>
      <div className="p-0 md:px-4">
        <div className="flex flex-column flex align-items-center mt-2">
          <div className="flex flex-column" style={{ width: "min(90rem, 90vw)" }}>
            <div className="flex justify-content-between">
              <Button
                className="text-sm md:text-lg lg:text-xl font-bold px-0 md:px-2"
                icon="pi pi-chevron-left"
                rounded
                text
                aria-label="Back"
                onClick={() => navigate(`/upload?q=${q}`)}
              >
                Uploads
              </Button>
              <h2 className="mx-auto md:text-xl lg:text-xxl w-max">{match?.name}</h2>
            </div>
            <DivisionNavigation onSelect={onDivisionSelect} />
            <MatchBumpChart match={match} division={division} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadPage = () => {
  const { uuid } = useParams();
  if (!uuid) {
    return <SearchUploads />;
  }

  return <MatchPage uuid={uuid} />;
};

export default UploadPage;
