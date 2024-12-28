import { Checkbox } from "primereact/checkbox";
import { SelectButton } from "primereact/selectbutton";
import { TabView, TabPanel } from "primereact/tabview";
import { useState } from "react";
import { PieChart } from "react-minimal-pie-chart";
import MultiProgress from "react-multi-progress";

import divisionPopularity0 from "../../../../data/stats/divisions_0YTD.json";
import divisionPopularity1 from "../../../../data/stats/divisions_1YTD.json";
import divisionPopularity2 from "../../../../data/stats/divisions_2YTD.json";
import divisionPopularity3 from "../../../../data/stats/divisions_3YTD.json";
import divisionPopularity4 from "../../../../data/stats/divisions_4YTD.json";
import divisionPopularity5 from "../../../../data/stats/divisions_5YTD.json";
import divisionPopularity6 from "../../../../data/stats/divisions_6YTD.json";
import divisionPopularity7 from "../../../../data/stats/divisions_7YTD.json";
import divisionPopularity8 from "../../../../data/stats/divisions_8YTD.json";
import { Row, Column } from "../../components";
import { useApi } from "../../utils/client";

import Activity from "./Activity";
import Distribution from "./Distribution";
import ELO from "./ELO";
import Inconsistencies from "./Inconsistencies";

export const ClassificationsChart = ({
  division,
  includeU,
  apiData,
  bar,
  alignBy,
  onClick,
}) => {
  const valueFor = letter => apiData?.[division]?.[letter] ?? 0;
  const totalInDivision =
    valueFor("GM") +
    valueFor("M") +
    valueFor("A") +
    valueFor("B") +
    valueFor("C") +
    valueFor("D") +
    (!includeU ? 0 : valueFor("U"));
  const topA = (100 * (valueFor("GM") + valueFor("M") + valueFor("A"))) / totalInDivision;
  const topM = (100 * (valueFor("GM") + valueFor("M"))) / totalInDivision;
  const data = [
    ...(!includeU && !!apiData
      ? []
      : [
          {
            letter: apiData ? "U" : "",
            title: apiData ? "U" : "Loading",
            value: valueFor("U"),
            color: "#939697",
          },
        ]),
    {
      title: apiData ? "D" : "",
      letter: apiData ? "D" : "",
      value: valueFor("D"),
      color: "#cc5e0d",
    },
    {
      title: apiData ? "C" : "",
      letter: apiData ? "C" : "",
      value: valueFor("C"),
      color: "#008627",
    },
    {
      title: apiData ? "B" : "",
      letter: apiData ? "B" : "",
      value: valueFor("B"),
      color: "#1a3bbd",
    },
    {
      title: apiData ? `A (Top ${topA.toFixed(3)}%)` : "",
      letter: apiData ? "A" : "",
      value: valueFor("A"),
      color: "#909",
    },
    {
      title: apiData ? `M (Top ${topM.toFixed(3)}%)` : "",
      letter: apiData ? "M" : "",
      value: valueFor("M"),
      color: "#994800",
    },
    {
      title: apiData ? "GM" : "",
      letter: apiData ? "GM" : "",
      value: valueFor("GM"),
      color: "#000000",
    },
  ];

  const total = data.map(d => d.value).reduce((a, b) => a + b);

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
            .map(d => Number(parseFloat((100.0 * d.value) / total).toFixed(2)))
            .reduce((a, b) => a + b, 0);

    const shortName = {
      all: "All",
      ltd: "Lim",
      l10: "L10",
      prod: "Prod",
      rev: "Rev",
      ss: "SS",
      co: "CO",
      lo: "LO",
      opn: "Open",
      pcc: "PCC",
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
            elements={data.map(d => ({
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
    <div style={{ margin: 8, cursor: "pointer" }} onClick={onClick}>
      <PieChart
        data={data}
        style={{
          fontFamily: '"Nunito Sans", -apple-system, Helvetica, Arial, sans-serif',
          fontSize: "3.0px",
          fontWeight: "bold",
        }}
        lineWidth={60}
        label={({ dataEntry: { percentage, value, letter } }) =>
          !value ? "" : `${letter} ${value} (${percentage.toFixed(2)}%)`
        }
        labelPosition={72}
        labelStyle={dataIndex => ({
          fill: data[dataIndex].title === "GM" ? "red" : "#000",
          opacity: 0.75,
          pointerEvents: "none",
        })}
      />
    </div>
  );
};

const ModeSwitch = ({ mode, setMode, modes }) => (
  <div className="card flex justify-content-center mt-4 mb-2 text-xs md:text-sm">
    <SelectButton
      className="compact"
      allowEmpty={false}
      options={modes}
      value={mode}
      onChange={e => setMode(e.value)}
    />
  </div>
);
const titleForDivMap = {
  opn: "Open",
  co: "Carry Optics",
  lo: "Limited Optics",
  pcc: "PCC",
  ltd: "Limited",
  l10: "Limited 10",
  prod: "Production",
  ss: "Single Stack",
  rev: "Revolver",

  all: "All Divisions",
};

// "By Cur. HHF Percent" => byCurHHFPercent
const modeMap = {
  HQ: "byClass",
  "HQ Cur.": "byPercent",
  "Cur. HHF": "byCurHHFPercent",
  Recommended: "byRecHHFPercent",
};
const modes = Object.keys(modeMap);
const modeBucketForMode = mode => modeMap[mode];

const colorForDivision = {
  opn: "#faaf18",
  ltd: "#b2ba35",
  l10: "#e6e7f7",
  prod: "#c7c9f4",
  ss: "#d7d9f6",
  rev: "#73e3e0",
  co: "#f04d43",
  lo: "#f68235",
  pcc: "#2ea8c7",
};

const formatDate = d => {
  if (!d) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(navigator.language, {
    month: "long",
    year: "numeric",
  });
  return formatter.format(new Date(d));
};

const DivisionsChart = ({ apiData }) => {
  if (!apiData) {
    return null;
  }

  const data = apiData.data.map(({ _id: title, scores: value, percent, start, end }) => ({
    title,
    value,
    color: colorForDivision[title] || "grey",
    percent,
    start,
    end,
  }));

  return (
    <div
      style={{ cursor: "pointer" }}
      className="min-w-20rem max-w-30rem flex-grow-1 mx-auto my-2"
    >
      <div>
        <PieChart
          data={data}
          style={{
            fontFamily: '"Nunito Sans", -apple-system, Helvetica, Arial, sans-serif',
            fontSize: "3.0px",
            fontWeight: "bold",
          }}
          lineWidth={60}
          label={({ dataEntry: { title, percent } }) => `${title}: ${percent}%`}
          totalValue={apiData.total}
          labelPosition={72}
          labelStyle={dataIndex => ({
            fill: data[dataIndex].title === "GM" ? "red" : "#000",
            opacity: 0.75,
            pointerEvents: "none",
          })}
        />
      </div>
      <div className="text-lg text-center">
        {formatDate(data[0].start)} — {formatDate(data[0].end)}
      </div>
    </div>
  );
};

const Divisions = () => (
  <div className="flex gap-4 flex-wrap mt-4">
    <DivisionsChart apiData={divisionPopularity0} />
    <DivisionsChart apiData={divisionPopularity1} />
    <DivisionsChart apiData={divisionPopularity2} />
    <DivisionsChart apiData={divisionPopularity3} />
    <DivisionsChart apiData={divisionPopularity4} />
    <DivisionsChart apiData={divisionPopularity5} />
    <DivisionsChart apiData={divisionPopularity6} />
    <DivisionsChart apiData={divisionPopularity7} />
    <DivisionsChart apiData={divisionPopularity8} />
  </div>
);

// main "page" of this file
export const StatsPage = () => {
  const [mode, setMode] = useState(modes[0]);
  const modeSwitchProps = { modes, mode, setMode };
  const modeBucket = modeBucketForMode(mode);
  const [includeU, setChecked] = useState(false);
  const { json: apiData } = useApi("/classifications");
  const [alignBy, setAlignBy] = useState(-1);
  const items = [
    { name: "D", value: -1 },
    { name: "C", value: 0 },
    { name: "B", value: 1 },
    { name: "A", value: 2 },
    { name: "M", value: 3 },
    { name: "GM", value: 4 },
  ];

  const [selectedDivision, setSelectedDivision] = useState("all");

  return (
    <div className="p-0 md:px-4">
      <TabView panelContainerClassName="p-0 md:px-4">
        <TabPanel header="Pie Charts" className="p-0 text-sm md:text-base">
          <ModeSwitch {...modeSwitchProps} />
          <div className="card flex justify-content-center m-0">
            Include Unclassified
            <Checkbox onChange={e => setChecked(e.checked)} checked={includeU} />
          </div>
          <div>
            <Row height={400}>
              <div className="w-12 md:w-7 lg:w-5">
                <ClassificationsChart
                  includeU={includeU}
                  division={selectedDivision}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("all")}
                />
              </div>
            </Row>
            <Row>
              <span style={{ fontSize: 24 }}>{titleForDivMap[selectedDivision]}</span>
            </Row>
            <Row>
              <Column>
                <ClassificationsChart
                  division="opn"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("opn")}
                />
                Open
              </Column>
              <Column>
                <ClassificationsChart
                  division="co"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("co")}
                />
                Carry Optics
              </Column>
              <Column>
                <ClassificationsChart
                  division="lo"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("lo")}
                />
                Limited Optics
              </Column>
            </Row>
            <Row>
              <Column>
                <ClassificationsChart
                  division="pcc"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("pcc")}
                />
                PCC
              </Column>
              <Column>
                <ClassificationsChart
                  division="ltd"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("ltd")}
                />
                Limited
              </Column>
              <Column>
                <ClassificationsChart
                  division="l10"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("l10")}
                />
                Limited 10
              </Column>
            </Row>
            <Row>
              <Column>
                <ClassificationsChart
                  division="prod"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("prod")}
                />
                Production
              </Column>
              <Column>
                <ClassificationsChart
                  division="ss"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("ss")}
                />
                Single Stack
              </Column>
              <Column>
                <ClassificationsChart
                  division="rev"
                  includeU={includeU}
                  apiData={apiData?.[modeBucket]}
                  onClick={() => setSelectedDivision("rev")}
                />
                Revolver
              </Column>
            </Row>
          </div>
        </TabPanel>

        <TabPanel header="Alignment" className="p-0 text-sm md:text-base">
          <ModeSwitch {...modeSwitchProps} />
          <div style={{ width: "100%", overflowX: "auto" }}>
            <div
              style={{
                width: 720,
                minWidth: 720,
                transform: ``,
                padding: 20,
                margin: "auto",
              }}
            >
              <Row>
                <ClassificationsChart
                  division="all"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="opn"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />{" "}
              </Row>
              <Row>
                <ClassificationsChart
                  division="co"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="lo"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="pcc"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="ltd"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="l10"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="prod"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="ss"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
              <Row>
                <ClassificationsChart
                  division="rev"
                  apiData={apiData?.[modeBucket]}
                  bar
                  alignBy={alignBy}
                />
              </Row>
            </div>
          </div>
          <div className="flex justify-content-center my-0">
            <SelectButton
              className="less-compact"
              value={alignBy}
              onChange={e => setAlignBy(e.value)}
              optionLabel="name"
              options={items}
            />
          </div>
        </TabPanel>
        <TabPanel header="Inconsistencies" className="p-0 text-sm md:text-base">
          <Inconsistencies />
        </TabPanel>
        <TabPanel header="Distribution" className="p-0 text-sm md:text-base">
          <Distribution />
        </TabPanel>
        <TabPanel header="ELO" className="p-0 text-sm md:text-base">
          <ELO />
        </TabPanel>
        <TabPanel header="Divisions" className="p-0 text-sm md:text-base">
          <Divisions />
        </TabPanel>
        <TabPanel header="Activity" className="p-0 text-sm md:text-base">
          <Activity />
        </TabPanel>
      </TabView>
    </div>
  );
};

export default StatsPage;
