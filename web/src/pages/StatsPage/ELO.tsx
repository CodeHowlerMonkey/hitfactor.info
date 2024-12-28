import { DivisionNavigation } from "../../components";
import ShootersELODistributionChart from "../../components/chart/ShootersELODistributionChart";

const ELO = () => (
  <>
    <DivisionNavigation uspsaOnly forcedDivision="co" />
    <ShootersELODistributionChart division="co" />
  </>
);

export default ELO;
