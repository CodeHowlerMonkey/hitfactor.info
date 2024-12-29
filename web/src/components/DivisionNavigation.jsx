import { Menu } from "primereact/menu";
import { TabView, TabPanel } from "primereact/tabview";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  divisionChangeMap,
  hfuDivisions,
  uspsaDivisions,
  sportName,
  scsaDivisions,
} from "../../../shared/constants/divisions";
import features from "../../../shared/features";
import usePreviousEffect from "../utils/usePreviousEffect";

const SportSelector = ({ sportCode, setSportCode, uspsaOnly, disableSCSA, hideSCSA }) => {
  const menu = useRef(null);
  const items = [
    {
      items: [
        {
          label: "USPSA",
          className: sportCode === "uspsa" && "focused-menu-item",
          command: () => setSportCode("uspsa"),
        },
        ...(hideSCSA
          ? []
          : [
              {
                label: "Steel Challenge",
                className: sportCode === "scsa" && "focused-menu-item",
                command: () => setSportCode("scsa"),
                disabled: !!disableSCSA,
              },
            ]),
        {
          label: "Hit-Factor Unified",
          className: sportCode === "hfu" && "focused-menu-item",
          command: () => setSportCode("hfu"),
        },
        {
          label: "PCSL (Coming Soon)",
          command: () => setSportCode("pcsl"),
          disabled: true,
        },
      ],
    },
  ];

  if (!features.hfu || uspsaOnly) {
    return null;
  }

  return (
    <div className="card flex justify-content-center">
      <Menu model={items} popup ref={menu} />
      <a
        role="tab"
        className="p-tabview-nav-link mr-4"
        tabIndex="-1"
        onClick={e => {
          e.preventDefault();

          menu.current.toggle(e);
          setTimeout(() => document.activeElement?.blur(), 0);
        }}
        aria-haspopup
      >
        <span className="p-tabview-title">{sportName(sportCode)}</span>
        <span className="pi pi-chevron-down ml-2 text-sm" />
      </a>
    </div>
  );
};

const divisionForSportAndIndex = (sport, index) => {
  if (sport === "hfu") {
    // minus1 the tabViewIndex, because it counts SportSelector as index 0
    return hfuDivisions[index - 1]?.short.toLowerCase();
  }
  if (sport === "scsa") {
    return scsaDivisions[index - 1]?.short.toLowerCase();
  }

  // minus1 the tabViewIndex, because it counts SportSelector as index 0
  return uspsaDivisions[index - 1]?.short_name?.toLowerCase?.();
};

const sportAndDivisionIndexForDivision = division => {
  // hfu is only additional sport without _ in the division name
  const hfuIndex = hfuDivisions.findIndex(
    c => c.short.toLowerCase() === (division || "invalid"),
  );
  if (hfuIndex >= 0) {
    // plusOne the dataIndex, because TabView counts SportSelector as index 0
    return ["hfu", hfuIndex + 1];
  }

  const scsaIndex = scsaDivisions.findIndex(
    c => c.short?.toLowerCase() === (division || "invalid"),
  );
  if (scsaIndex >= 0) {
    // plusOne the dataIndex, because TabView counts SportSelector as index 0
    return ["scsa", scsaIndex + 1];
  }

  // TODO: check for normal sport_division divisions here

  // uspsa is default
  const uspsaIndex = uspsaDivisions.findIndex(
    c => c?.short_name?.toLowerCase() === (division || "invalid"),
  );
  if (uspsaIndex >= 0) {
    // plusOne the dataIndex, because TabView counts SportSelector as index 0
    return ["uspsa", uspsaIndex + 1];
  }

  return ["uspsa", -1];
};

export const defaultDivisionForSport = sport => {
  switch (sport) {
    case "scsa":
      return "scsa_opn";
    case "uspsa":
      return "opn";
    case "hfu":
      return "comp";
    default:
      return "";
  }
};

export const DivisionNavigation = ({
  onSelect,
  uspsaOnly,
  disableSCSA,
  hideSCSA,
  forcedDivision,
}) => {
  // TODO: save in localStorage last sport/division selection
  const { division } = useParams();

  const [initialSport, initialDivisionIndex] = sportAndDivisionIndexForDivision(
    forcedDivision || division,
  );
  const [sportCode, setSportCode] = useState(initialSport);
  const [activeIndex, setActiveIndex] = useState(initialDivisionIndex);

  // update selection if navigation changes
  useEffect(() => {
    const [sport, divisionIndex] = sportAndDivisionIndexForDivision(division);
    if (features.hfu && !uspsaOnly) {
      setActiveIndex(divisionIndex);
      setSportCode(sport);
    } else if (sport === "hfu") {
      // bail back to uspsa/opn if hfu is disabled or not supported
      setSportCode("uspsa");
      setActiveIndex(1);
      onSelect("opn", "uspsa");
    } else if (sport === "scsa") {
      setSportCode("scsa");
      setActiveIndex(1);
      onSelect("scsa_opn", "scsa");
    }
  }, [division, setActiveIndex]); //eslint-disable-line react-hooks/exhaustive-deps

  usePreviousEffect(
    ([prevSportCode]) => {
      if (prevSportCode === sportCode) {
        return;
      }

      const prevDivision = divisionForSportAndIndex(prevSportCode, activeIndex);
      const newDivision =
        divisionChangeMap[sportCode][prevDivision] || defaultDivisionForSport(sportCode);
      const [newSport, newIndex] = sportAndDivisionIndexForDivision(newDivision);

      // Default to 1 (Open/Comp), instead of -1 (not found) when changing sport
      setActiveIndex(newIndex >= 0 ? newIndex : 1);
      onSelect(newDivision, newSport);
    },
    [sportCode],
  );

  // TabView uses index off children, and even false as a child takes index
  const tabViewItems = [
    ...(sportCode !== "hfu"
      ? []
      : hfuDivisions.map(hfuDiv => (
          <TabPanel
            key={hfuDiv.short}
            header={hfuDiv.long}
            className="p-0 text-sm md:text-base"
          />
        ))),
    ...(sportCode !== "uspsa"
      ? []
      : uspsaDivisions.map(uspsaDiv => (
          <TabPanel
            disabled={
              !!forcedDivision && uspsaDiv.short_name.toLowerCase() !== forcedDivision
            }
            key={uspsaDiv.id}
            header={uspsaDiv.long_name}
            className="p-0 text-sm md:text-base"
          />
        ))),
    ...(sportCode !== "scsa"
      ? []
      : scsaDivisions.map(curDiv => (
          <TabPanel
            disabled={!!forcedDivision && curDiv.short !== forcedDivision}
            key={curDiv.long}
            header={curDiv.long}
            className="p-0 text-sm md:text-base"
          />
        ))),
  ];

  return (
    <div className="p-0 md:px-4">
      <TabView
        panelContainerClassName="p-0 md:px-8"
        activeIndex={activeIndex}
        onTabChange={({ index }) => {
          const newDivision = divisionForSportAndIndex(sportCode, index);
          onSelect?.(newDivision);
          setActiveIndex(index);
        }}
      >
        <TabPanel
          header="Mode"
          headerTemplate={
            <SportSelector
              sportCode={sportCode}
              setSportCode={setSportCode}
              uspsaOnly={uspsaOnly}
              disableSCSA={disableSCSA}
              hideSCSA={hideSCSA}
            />
          }
        />
        {tabViewItems}
      </TabView>
      {activeIndex < 0 && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          Select Division to Start
        </div>
      )}
    </div>
  );
};

export default DivisionNavigation;
