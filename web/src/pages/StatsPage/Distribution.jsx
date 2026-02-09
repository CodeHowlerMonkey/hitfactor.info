import { useNavigate, useParams } from "react-router-dom";

import { DivisionNavigation } from "../../components";
import { ShootersDistributionChart } from "../../components/chart/ShootersDistributionChart";

const Distribution = () => {
  const { division } = useParams();
  const navigate = useNavigate();

  return (
    <>
      <DivisionNavigation
        onSelect={div => navigate(`/stats/distribution/${div}`)}
        hideSCSA
      />
      {division && <ShootersDistributionChart division={division} />}
    </>
  );
};

export default Distribution;
