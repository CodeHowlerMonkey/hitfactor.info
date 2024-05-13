import { Textfit } from "react-textfit";

export const ClassifierCell = ({ info, onClick, fallback }) => {
  if (!info || !info.code || !info.name) {
    return fallback;
  }

  const { name, code, scoring } = info;
  return (
    <div
      className="flex flex-column w-8rem md:w-12rem"
      style={onClick ? { cursor: "pointer" } : {}}
      onClick={onClick}
    >
      <div className="flex flex-row justify-content-between">
        <div className="font-bold text-color-secondary">{code}</div>
        <div className="text-xs text-color-secondary">{scoring}</div>
      </div>
      <div className="text-color">
        <Textfit max={16} mode="multi">
          {name}
        </Textfit>
      </div>
    </div>
  );
};

export default ClassifierCell;
