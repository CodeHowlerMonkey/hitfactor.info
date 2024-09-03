import cx from "classnames";
import { Textfit } from "react-textfit";

import { useIsHFU } from "../utils/useIsHFU";

export const ClassifierCell = ({ info, onClick, fallback, showScoring, division }) => {
  const isHFU = useIsHFU();

  const { name, code, scoring } = info || {};
  return (
    <div
      className="flex flex-column w-8rem md:w-12rem"
      style={onClick ? { cursor: "pointer" } : {}}
      onClick={() => {
        if (code) {
          onClick?.();
        }
      }}
    >
      <div className="flex flex-row justify-content-between">
        <div className={cx("font-bold", { "text-color-secondary": !!code })}>
          {code || fallback}
        </div>
        {isHFU && (
          <div className="text-xs text-color-secondary">{division?.toUpperCase()}</div>
        )}
        {showScoring && scoring && (
          <div className="text-xs text-color-secondary">{scoring}</div>
        )}
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
