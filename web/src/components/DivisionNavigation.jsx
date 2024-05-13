import { TabView, TabPanel } from "primereact/tabview";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { divisions } from "../../../data/division.json";

const divisionForIndex = (index) => divisions[index]?.short_name?.toLowerCase?.();
const indexForDivision = (division) =>
  divisions.findIndex((c) => c?.short_name?.toLowerCase() === (division || "invalid"));

export const DivisionNavigation = ({ onSelect }) => {
  const { division } = useParams();
  const [activeIndex, setActiveIndex] = useState(indexForDivision(division));

  // update selection if navigation changes
  useEffect(() => {
    setActiveIndex(indexForDivision(division));
  }, [division, setActiveIndex]);

  return (
    <div className="p-0 md:px-4">
      <TabView
        panelContainerClassName="p-0 md:px-8"
        activeIndex={activeIndex}
        onTabChange={({ index }) => {
          onSelect?.(divisionForIndex(index));
          setActiveIndex(index);
        }}
      >
        {divisions.map((division) => (
          <TabPanel
            key={division.id}
            header={division.long_name}
            className="p-0 text-sm md:text-base"
          />
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

export default DivisionNavigation;
