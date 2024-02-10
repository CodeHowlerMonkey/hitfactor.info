import { Scatter } from "react-chartjs-2";
import { useApi } from "./client";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

//              [{ x: -10, y: 0 }],
export const ScoresChart = ({ division, classifier }) => {
  const data = useApi(`/classifiers/${division}/${classifier}/chart`) ?? [];
  return (
    <Scatter
      options={{
        maintainAspectRatio: false,
        scales: { y: { reverse: true } },
      }}
      data={{
        datasets: [
          {
            label: "HF / Percentile",
            data,
            backgroundColor: "#ae9ef1",
          },
        ],
      }}
    />
  );
};

export default ScoresChart;
