import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { useMemo, useState } from "react";

import { Line } from "./common";

import { sportForDivision } from "../../../../shared/constants/divisions";
import { useApi } from "../../utils/client";

const annotationColor = alpha => `rgba(255, 99, 132, ${alpha})`;
const yLine = (name, y, alpha) => ({
  [name]: {
    type: "line",
    yMin: y,
    yMax: y,
    borderColor: annotationColor(alpha * 0.5),
    borderWidth: 1,
  },
  [`${name}Label`]: {
    type: "label",
    xValue: "auto",
    yValue: y,
    color: annotationColor(alpha),
    position: { x: "center", y: "center" },
    content: [`${y}%`],
    font: {
      size: 8,
    },
  },
});

export const ShooterChart = ({ division, memberNumber }) => {
  const isHFU = sportForDivision(division) === "hfu";
  const [full, setFull] = useState(false);
  const { json: data, loading } = useApi(`/shooters/${division}/${memberNumber}/chart`);
  const mappedData = useMemo(
    () =>
      data?.map(c => ({
        ...c,
        x: new Date(new Date(c.x).toLocaleDateString("en-us", { timeZone: "UTC" })),
        y: c.recPercent,
      })),
    [data],
  );
  const classifiersData = useMemo(
    () => mappedData?.filter(c => c.source === "Stage Score"),
    [mappedData],
  );
  const majorsData = useMemo(
    () =>
      mappedData
        ?.filter(c => c.source === "Major Match")
        .map(c => ({ ...c, y: c.percent })),
    [mappedData],
  );
  const bumpsData = useMemo(
    () => mappedData?.filter(c => c.source === "Major Match" && c.eligible),
    [mappedData],
  );
  if (loading) {
    return <ProgressSpinner />;
  }

  if (!data) {
    return null;
  }

  const graph = (
    <Line
      style={{ width: "100%", height: "100%", position: "relative" }}
      adapters={null}
      options={{
        responsive: true,
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            min: "auto",
            time: {
              parser: "MM/dd/yy",
              unit: "month",
            },
          },
        },
        elements: {
          line: {
            fill: "blue",
            color: "blue",
            borderColor: "pink",
            borderWidth: 1,
          },
          point: {
            label: "kek",
            radius: 2,
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: ({ raw: { y, classifier } }) => `${classifier}: ${y}%`,
              title: ([
                {
                  raw: { x },
                },
              ]) => x,
            },
          },
          annotation: {
            annotations: {
              ...yLine("HHF", 100, 1),
              ...yLine("GM", 95, 0.7),
              ...yLine("M", 85, 0.5),
              ...yLine("A", 75, 0.4),
              ...yLine("B", 60, 0.3),
              ...yLine("C", 40, 0.2),
            },
          },
        },
      }}
      data={{
        datasets: [
          {
            label: "Classifiers",
            data: classifiersData,
            borderColor: isHFU ? "#ca258a" : "#40cf40",
            backgroundColor: isHFU ? "#ae9ef1" : "#05ca25",
          },
          {
            label: "Majors",
            data: majorsData,
            backgroundColor: "#b5ca25",
          },
          {
            label: "Bumps",
            data: bumpsData,
            borderColor: "#ca258a",
            backgroundColor: "#c69393",
          },
        ].filter(Boolean),
      }}
    />
  );

  if (full) {
    return (
      <Dialog
        header="Scores Distribution"
        visible
        style={{ width: "96vw", height: "96vh", margin: "16px" }}
        onHide={() => setFull(false)}
      >
        {graph}
      </Dialog>
    );
  }

  return (
    <>
      {graph}
      <Button
        onClick={() => setFull(true)}
        rounded
        text
        icon="pi pi-arrows-alt"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          transform: "rotate(45deg)",
        }}
      />
    </>
  );
};

export default ShooterChart;
