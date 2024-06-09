import { Dropdown } from "primereact/dropdown";
import { useState } from "react";
import classifiers from "../../../data/classifiers/classifiers.json";
import { classifierCodeSort } from "../../../shared/utils/sort";

const classifierOptions = classifiers.classifiers
  .map((c) => ({ ...c, optionLabel: `${c.classifier}  ${c.name}` }))
  .sort((a, b) => classifierCodeSort(a, b, "classifier", 1));

/**
 * Component to select classifiers for WhatIfs, with value being
 * classifier code as a string (e.g. '99-02') for both value and onChange
 */
const ClassifierDropdown = ({ value, onChange }) => {
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
      value={classifierOptions.find((c) => c.classifier === value)}
      onChange={(e) => onChange?.(e.value.classifier)}
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
