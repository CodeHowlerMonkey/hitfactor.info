import { useState } from "react";

import { DivisionNavigation } from "../../components";
import ShootersELODistributionChart from "../../components/chart/ShootersELODistributionChart";

const ELO = () => {
  // TODO: react-router params for all of StatsPage
  const [division, setDivision] = useState();

  return (
    <>
      <DivisionNavigation uspsaOnly onSelect={setDivision} />
      {division && <ShootersELODistributionChart division={division} />}
    </>
  );
};
export default ELO;
