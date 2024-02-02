import { useState } from "react";
import { PieChart } from "react-minimal-pie-chart";
import { Row, Column } from "./common";
import { useApi } from "./client";
import { Checkbox } from "primereact/checkbox";
import { TabView, TabPanel } from "primereact/tabview";
import MultiProgress from "react-multi-progress";
import { SelectButton } from "primereact/selectbutton";

export const ClassificationsChart = ({
  division,
  includeU,
  apiData,
  bar,
  alignBy,
}) => {
  const data = [
    ...(!includeU && !!apiData
      ? []
      : [
          {
            title: apiData ? "U" : "Loading",
            value: apiData?.[division]?.["U"] ?? 0,
            color: "#939697",
          },
        ]),
    {
      title: apiData ? "D" : "",
      value: apiData?.[division]?.["D"] ?? 0,
      color: "#cc5e0d",
    },
    {
      title: apiData ? "C" : "",
      value: apiData?.[division]?.["C"] ?? 0,
      color: "#008627",
    },
    {
      title: apiData ? "B" : "",
      value: apiData?.[division]?.["B"] ?? 0,
      color: "#1a3bbd",
    },
    {
      title: apiData ? "A" : "",
      value: apiData?.[division]?.["A"] ?? 0,
      color: "#909",
    },
    {
      title: apiData ? "M" : "",
      value: apiData?.[division]?.["M"] ?? 0,
      color: "#994800",
    },
    {
      title: apiData ? "GM" : "",
      value: apiData?.[division]?.["GM"] ?? 0,
      color: "#000000",
    },
  ];

  const total = data.map((d) => d.value).reduce((a, b) => a + b);

  if (bar) {
    const shift = [
      0.15,
      0.15 + 0.4,
      0.15 + 0.4 + 0.25,
      0.15 + 0.4 + 0.25 + 0.12,
      0.15 + 0.4 + 0.25 + 0.12 + 0.06,
      1.0,
    ];
    const offset =
      alignBy < 0
        ? 1
        : data
            .filter((v, index) => index <= alignBy)
            .map((d) =>
              Number(parseFloat((100.0 * d.value) / total).toFixed(2))
            )
            .reduce((a, b) => a + b, 0);

    const shortName = {
      Limited: "Lim",
      "Limited 10": "L10",
      Production: "Prod",
      Revolver: "Rev",
      "Single Stack": "SS",
      "Carry Optics": "CO",
      "Limited Optics": "LO",
    };

    return (
      <>
        <div
          style={{
            width: "600px",
            position: "relative",
            right: `${6 * offset - 600 * (shift[alignBy] ?? 0)}px`,
          }}
        >
          <MultiProgress
            elements={data.map((d) => ({
              ...d,
              showPercentage: true,
              value: Number(parseFloat((100.0 * d.value) / total).toFixed(2)),
            }))}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            width: 60,
            textAlign: "right",
            position: "relative",
            right: `${6 * offset - 600 * shift[alignBy]}px`,
          }}
        >
          {shortName[division] ?? division}
        </span>
      </>
    );
  }

  return (
    <div style={{ margin: 8 }}>
      <PieChart
        data={data}
        style={{
          fontFamily:
            '"Nunito Sans", -apple-system, Helvetica, Arial, sans-serif',
          fontSize: "3.0px",
          fontWeight: "bold",
        }}
        lineWidth={60}
        label={({ dataEntry: { title, percentage, value } }) =>
          !value ? "" : `${title} ${value} (${Math.round(percentage)}%)`
        }
        labelPosition={72}
        labelStyle={(dataIndex) => ({
          fill: data[dataIndex].title === "GM" ? "red" : "#000",
          opacity: 0.75,
          pointerEvents: "none",
        })}
      />
    </div>
  );
};

// main "page" of this file
export const ClassificationStats = () => {
  const [includeU, setChecked] = useState(false);
  const apiData = useApi("/classifications");
  const [alignBy, setAlignBy] = useState(-1);
  const items = [
    { name: "D", value: -1 },
    { name: "C", value: 0 },
    { name: "B", value: 1 },
    { name: "A", value: 2 },
    { name: "M", value: 3 },
    { name: "GM", value: 4 },
  ];

  return (
    <TabView>
      <TabPanel header="Pie Charts">
        <div>
          Include Unclassified
          <Checkbox
            onChange={(e) => setChecked(e.checked)}
            checked={includeU}
          />
          <Row height={400}>
            <div style={{ width: "50%", margin: "0 80px" }}>
              <ClassificationsChart
                includeU={includeU}
                division="All"
                apiData={apiData}
              />
            </div>
          </Row>
          <Row>
            <span style={{ fontSize: 24 }}>All Divisions</span>
          </Row>
          <Row>
            <Column>
              <ClassificationsChart
                division="Open"
                includeU={includeU}
                apiData={apiData}
              />
              Open
            </Column>
            <Column>
              <ClassificationsChart
                division="Carry Optics"
                includeU={includeU}
                apiData={apiData}
              />
              Carry Optics
            </Column>
            <Column>
              <ClassificationsChart
                division="Limited Optics"
                includeU={includeU}
                apiData={apiData}
              />
              Limited Optics
            </Column>
          </Row>
          <Row>
            <Column>
              <ClassificationsChart
                division="PCC"
                includeU={includeU}
                apiData={apiData}
              />
              PCC
            </Column>
            <Column>
              <ClassificationsChart
                division="Limited"
                includeU={includeU}
                apiData={apiData}
              />
              Limited
            </Column>
            <Column>
              <ClassificationsChart
                division="Limited 10"
                includeU={includeU}
                apiData={apiData}
              />
              Limited 10
            </Column>
          </Row>
          <Row>
            <Column>
              <ClassificationsChart
                division="Production"
                includeU={includeU}
                apiData={apiData}
              />
              Production
            </Column>
            <Column>
              <ClassificationsChart
                division="Single Stack"
                includeU={includeU}
                apiData={apiData}
              />
              Single Stack
            </Column>
            <Column>
              <ClassificationsChart
                division="Revolver"
                includeU={includeU}
                apiData={apiData}
              />
              Revolver
            </Column>
          </Row>
        </div>
      </TabPanel>

      <TabPanel header="Alignment">
        <div className="card flex justify-content-center">
          <SelectButton
            value={alignBy}
            onChange={(e) => setAlignBy(e.value)}
            optionLabel="name"
            options={items}
          />
        </div>
        <div>
          <Row>
            <ClassificationsChart
              division="All"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Limited Optics"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Limited 10"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Single Stack"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Carry Optics"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Limited"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Production"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Revolver"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="PCC"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />
          </Row>
          <Row>
            <ClassificationsChart
              division="Open"
              apiData={apiData}
              bar
              alignBy={alignBy}
            />{" "}
          </Row>
        </div>
        <div style={{ height: 24 }} />
        <Row>
          <ClassificationsChart division="Approx" apiData={apiData} bar />{" "}
        </Row>
      </TabPanel>
    </TabView>
  );
};

export default ClassificationStats;
