import { useNavigate } from "react-router-dom";
import { DivisionNavigation } from "../../components";
import ShootersTable from "../ShootersPage/components/ShootersTable";
import { useEffect, useState } from "react";
import { SelectButton } from "primereact/selectbutton";

const classFilterItems = (mode) =>
  [
    mode === "paper" ? null : { name: "X", value: "X" },
    mode === "paper" ? null : { name: "D", value: "D" },
    { name: "C", value: "C" },
    { name: "B", value: "B" },
    { name: "A", value: "A" },
    { name: "M", value: "M" },
    mode === "sand" ? null : { name: "GM", value: "GM" },
  ].filter(Boolean);

const ClassFilterSelect = ({ mode, value, setValue }) => (
  <div className="mx-2">
    <SelectButton
      value={value}
      onChange={(e) => setValue(e.value)}
      optionLabel="name"
      options={classFilterItems(mode)}
    />
  </div>
);

const modeItems = [
  { name: "Sand", value: "sand" },
  { name: "Paper", value: "paper" },
];

const ModeSelect = ({ value, setValue }) => (
  <div className="mx-2">
    <SelectButton
      value={value}
      onChange={(e) => setValue(e.value)}
      optionLabel="name"
      options={modeItems}
    />
  </div>
);

const versusItems = [
  { name: "Cur. HHF", value: "curHHFClass" },
  { name: "Recommended", value: "recClass" },
  { name: "Brutal", value: "brutalClass" },
];

const VersusSelect = ({ value, setValue }) => (
  <div className="mx-2">
    <SelectButton
      value={value}
      onChange={(e) => setValue(e.value)}
      optionLabel="name"
      options={versusItems}
    />
  </div>
);

const Inconsistencies = () => {
  // TODO: react-router params for all of ClassificationsPage

  const navigate = useNavigate();
  const [division, setDivision] = useState(null);

  const [versus, setVersus] = useState("recClass");
  const [mode, setMode] = useState("paper");
  const [classFilter, setClassFilter] = useState("GM");

  useEffect(() => setClassFilter(null), [mode]);

  const inconsistencies = versus + "-" + mode;

  return (
    <div>
      <div className="flex flex-row justify-content-between mx-4 my-2">
        <VersusSelect value={versus} setValue={setVersus} />
        <div className="flex-grow-1" />
        <ModeSelect value={mode} setValue={setMode} />
        <ClassFilterSelect value={classFilter} setValue={setClassFilter} mode={mode} />
      </div>
      <DivisionNavigation onSelect={setDivision} />
      {division && (
        <div>
          <ShootersTable
            onShooterSelection={(memberNumber) =>
              navigate(`/shooters/${division}/${memberNumber}`)
            }
            division={division}
            inconsistencies={inconsistencies}
            classFilter={classFilter}
          />
        </div>
      )}
    </div>
  );
};

export default Inconsistencies;
