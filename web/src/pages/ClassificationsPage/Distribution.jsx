import { useNavigate } from "react-router-dom";
import { DivisionNavigation } from "../../components";
import ShootersTable from "../ShootersPage/components/ShootersTable";
import { useEffect, useState } from "react";
import { SelectButton } from "primereact/selectbutton";
import { ShootersDistributionChart } from "../../components/chart/ShootersDistributionChart";

const Distribution = () => {
  // TODO: react-router params for all of ClassificationsPage

  const navigate = useNavigate();
  const [division, setDivision] = useState(null);

  return (
    <>
      <DivisionNavigation onSelect={setDivision} />
      {division && <ShootersDistributionChart division={division} />}
    </>
  );
};

export default Distribution;
