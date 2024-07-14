import { TabView, TabPanel } from "primereact/tabview";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Menu } from "primereact/menu";
import {
  divisionChangeMap,
  hfuDivisions,
  uspsaDivisions,
  sportName,
} from "../../../shared/constants/divisions";
import usePreviousEffect from "../utils/usePreviousEffect";
import features from "../../../shared/features";

const SportSelector = ({ sportCode, setSportCode }) => {
  const menu = useRef(null);
  const items = [
    {
      items: [
        {
          label: "USPSA",
          className: sportCode === "uspsa" && "focused-menu-item",
          command: () => setSportCode("uspsa"),
        },
        {
          label: "HitFactor (Unified)",
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

  if (!features.hfu) {
    return null;
  }

  return (
    <div className="card flex justify-content-center">
      <Menu model={items} popup ref={menu} />
      <a
        role="tab"
        className="p-tabview-nav-link mr-4"
        tabIndex="-1"
        onClick={(e) => {
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

  // minus1 the tabViewIndex, because it counts SportSelector as index 0
  return uspsaDivisions[index - 1]?.short_name?.toLowerCase?.();
};

const sportAndDivisionIndexForDivision = (division) => {
  // hfu is only additional sport without _ in the division name
  const hfuIndex = hfuDivisions.findIndex(
    (c) => c.short.toLowerCase() === (division || "invalid")
  );
  if (hfuIndex >= 0) {
    // plusOne the dataIndex, because TabView counts SportSelector as index 0
    return ["hfu", hfuIndex + 1];
  }

  // TODO: check for normal sport_division divisions here

  // uspsa is default
  const uspsaIndex = uspsaDivisions.findIndex(
    (c) => c?.short_name?.toLowerCase() === (division || "invalid")
  );
  if (uspsaIndex >= 0) {
    // plusOne the dataIndex, because TabView counts SportSelector as index 0
    return ["uspsa", uspsaIndex + 1];
  }

  return ["uspsa", -1];
};

export const DivisionNavigation = ({ onSelect, uspsaOnly }) => {
  // TODO: save in localStorage last sport/division selection
  const { division } = useParams();

  const [initialSport, initialDivisionIndex] = sportAndDivisionIndexForDivision(division);
  const [sportCode, setSportCode] = useState(initialSport);
  const [activeIndex, setActiveIndex] = useState(initialDivisionIndex);

  // bail to uspsa, if hfu is disabled or uspsaOnly is requested
  useEffect(() => {
    const [sport] = sportAndDivisionIndexForDivision(division);
    if (sport !== "uspsa" && (!features.hfu || uspsaOnly)) {
      setSportCode("uspsa");
      setActiveIndex(1);
      onSelect("opn", "uspsa");
    }
  }, [onSelect, division]);

  // update selection if navigation changes
  useEffect(() => {
    const [sport, divisionIndex] = sportAndDivisionIndexForDivision(division);
    setSportCode(sport);
    setActiveIndex(divisionIndex);
  }, [division, setActiveIndex]);

  usePreviousEffect(
    ([prevSportCode]) => {
      if (prevSportCode === sportCode) {
        return;
      }
      const prevDivision = divisionForSportAndIndex(prevSportCode, activeIndex);
      const newDivision = divisionChangeMap[sportCode][prevDivision];
      const [newSport, newIndex] = sportAndDivisionIndexForDivision(newDivision);

      // Default to 1 (Open/Comp), instead of -1 (not found) when changing sport
      setActiveIndex(newIndex >= 0 ? newIndex : 1);
      onSelect(newDivision, newSport);
    },
    [sportCode]
  );

  // TabView uses index off children, and even false as a child takes index
  const tabViewItems = [
    ...(sportCode !== "hfu"
      ? []
      : hfuDivisions.map((division) => (
          <TabPanel
            key={division.short}
            header={division.long}
            className="p-0 text-sm md:text-base"
          />
        ))),
    ...(sportCode !== "uspsa"
      ? []
      : uspsaDivisions.map((division) => (
          <TabPanel
            key={division.id}
            header={division.long_name}
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
            <SportSelector sportCode={sportCode} setSportCode={setSportCode} />
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
