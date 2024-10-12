import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";
import { useEffect, useRef, useState } from "react";

import data from "../../../../data/stats/scoresByTwoMonth.json";
import ActivityChart from "../../components/chart/ActivityChart";

const Activity = () => {
  const dashboardRef = useRef();

  const [mongoError, setMongoError] = useState(false);

  useEffect(() => {
    const sdk = new ChartsEmbedSDK({
      baseUrl: "https://charts.mongodb.com/charts-project-0-flbfp",
    });

    const dashboard = sdk.createDashboard({
      dashboardId: "6736f013-67dc-4ae1-8d40-f353ba7a8930",
      theme: "dark",
      background: "#282936",
      showAttribution: false,
      height: 3256,
      widthMode: "scale",
      heightMode: "fixed",
    });

    dashboard.render(dashboardRef.current).catch(() => setMongoError(true));
  }, []);

  return (
    <div className="my-4">
      {mongoError ? (
        <div className="mx-4">
          <ActivityChart data={data} />
        </div>
      ) : (
        <div className="w-full" ref={dashboardRef} />
      )}
    </div>
  );
};

export default Activity;
