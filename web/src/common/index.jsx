import { TabView, TabPanel } from "primereact/tabview";
import { divisions } from "../../../data/division.json";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export const Row = ({ children }) => (
  <div
    style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}
  >
    {children}
  </div>
);

export const Column = ({ children }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >
    {children}
  </div>
);

const divisionForIndex = (index) =>
  divisions[index]?.short_name?.toLowerCase?.();
const indexForDivision = (division) =>
  divisions.findIndex(
    (c) => c?.short_name?.toLowerCase() === (division || "invalid")
  );

export const DivisionNav = ({ onSelect }) => {
  const { division } = useParams();
  const [activeIndex, setActiveIndex] = useState(indexForDivision(division));

  /*
  // call parent when division selection changes
  useEffect(
    () => onSelect?.(divisionForIndex(activeIndex)),
    [activeIndex, onSelect]
  );
  */

  // update selection if navigation changes
  useEffect(() => {
    setActiveIndex(indexForDivision(division));
  }, [division, setActiveIndex]);

  return (
    <div>
      <TabView
        panelContainerStyle={{ padding: 0 }}
        activeIndex={activeIndex}
        onTabChange={({ index }) => {
          onSelect?.(divisionForIndex(index));
          setActiveIndex(index);
        }}
      >
        {divisions.map((division) => (
          <TabPanel key={division.id} header={division.long_name} />
        ))}
      </TabView>
      {activeIndex < 0 && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          Select Division to Start
        </div>
      )}
    </div>
  );
};
