import { Line } from "./common";

const ActivityChart = ({ data: dataRaw }) => {
  if (!dataRaw) {
    return null;
  }

  const now = new Date().getTime();
  const start = new Date("2016-09-01").getTime();
  const data = dataRaw.filter(d => {
    const ts = new Date(d.week).getTime();
    if (!ts) {
      return false;
    }

    if (ts < start || ts > now) {
      return false;
    }

    return true;
  });

  return (
    <div className="relative bg-primary-reverse flex-grow-1">
      <Line
        style={{ width: "100%", height: "100%", position: "relative" }}
        adapters={null}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: "time",
              min: "auto",
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
              label: "_",
              radius: 2,
            },
          },
          plugins: {
            zoom: {
              pan: { enabled: true },
              zoom: {
                mode: "x",
                enabled: true,
                wheel: {
                  enabled: true,
                },
                pinch: {
                  enabled: true,
                },
              },
            },
            tooltip: {
              callbacks: {
                label: ({ raw: { y } }) => `${y}`,
                title: ([
                  {
                    raw: { x },
                  },
                ]) => x.toLocaleDateString(),
              },
            },
          },
        }}
        data={{
          datasets: [
            {
              label: "Active Member Numbers",
              data: data.map(c => ({
                x: new Date(
                  new Date(c.week).toLocaleDateString("en-us", { timeZone: "UTC" }),
                ),
                y: c.shooterCount,
              })),
              backgroundColor: "#ae9ef1",
              borderColor: "#ca258a",
            },
          ],
        }}
      />
    </div>
  );
};

export default ActivityChart;
