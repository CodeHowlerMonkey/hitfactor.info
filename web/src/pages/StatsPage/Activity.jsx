import data from "../../../../data/stats/scoresByWeek.json";
import ActivityChart from "../../components/chart/ActivityChart";

const Activity = () => (
  <div className="mx-4 my-4">
    <ActivityChart data={data} />
  </div>
);

export default Activity;
