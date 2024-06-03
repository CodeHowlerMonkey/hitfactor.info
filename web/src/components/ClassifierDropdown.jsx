import { Dropdown } from "primereact/dropdown";
import { useState } from "react";
import classifiers from "../../../data/classifiers/classifiers.json";
import { classifierCodeSort } from "../../../shared/utils/sort";
import ClassifierCell from "./ClassifierCell";
import { Divider } from "primereact/divider";

console.log(classifiers.classifiers.length);

const classifierOptions = classifiers.classifiers
  .map((c) => ({ ...c, optionLabel: `${c.classifier}  ${c.name}` }))
  .sort((a, b) => classifierCodeSort(a, b, "classifier", 1));

const ClassifierDropdown = ({ onChange }) => {
  const [value, setValue] = useState(null);

  const itemTemplate = (c) =>
    c ? (
      <div style={{ maxWidth: "12em" }}>{c.optionLabel}</div>
    ) : (
      <div className="text-300">Classifier</div>
    );

  return (
    <Dropdown
      filter
      placeholder="Classifier"
      value={value}
      onChange={(e) => {
        setValue(e.value);
        onChange?.(e.value.classifier);
      }}
      itemTemplate={itemTemplate}
      valueTemplate={itemTemplate}
      options={classifierOptions}
      optionLabel="optionLabel"
      className="w-full"
      style={{ maxWidth: "12em" }}
      panelClassName="classifier-dropdown"
    />
  );
};

export default ClassifierDropdown;
