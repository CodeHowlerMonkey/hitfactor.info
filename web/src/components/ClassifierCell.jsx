import { Textfit } from "react-textfit";

export const ClassifierCell = ({ code, name, scoring }) => (
  <div className="flex flex-column w-12rem">
    <div className="flex flex-row justify-content-between">
      <div className="font-bold text-color-secondary">{code}</div>
      <div className="text-xs text-color-secondary">{scoring}</div>
    </div>
    <div className="text-color">
      <Textfit max={16} mode="single">
        {name}
      </Textfit>
    </div>
  </div>
);

export default ClassifierCell;
