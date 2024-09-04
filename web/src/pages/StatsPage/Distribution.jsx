import { useState } from "react";

import { DivisionNavigation } from "../../components";
import { ShootersDistributionChart } from "../../components/chart/ShootersDistributionChart";

const Distribution = () => {
  // TODO: react-router params for all of ClassificationsPage
  const [division, setDivision] = useState(null);

  return (
    <>
      <DivisionNavigation onSelect={setDivision} hideSCSA />
      {division && <ShootersDistributionChart division={division} />}
    </>
  );
};

export default Distribution;
