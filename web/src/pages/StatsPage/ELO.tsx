import { useNavigate, useParams } from "react-router-dom";

import { DivisionNavigation } from "../../components";
import ShootersELODistributionChart from "../../components/chart/ShootersELODistributionChart";

const ELO = () => {
  const { division } = useParams();
  const navigate = useNavigate();

  return (
    <>
      <DivisionNavigation uspsaOnly onSelect={div => navigate(`/stats/elo/${div}`)} />
      {division && <ShootersELODistributionChart division={division} />}
    </>
  );
};
export default ELO;
