import { useParams } from "react-router-dom";

import { useApi } from "../../utils/client";

import SearchUploads from "./SearchUploads";

const MatchPage = ({ uuid }) => {
  const match = useApi(`/upload/${uuid}`);

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-2">
        {JSON.stringify(match, null, 2)}
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
