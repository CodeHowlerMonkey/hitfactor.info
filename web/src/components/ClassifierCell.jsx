import cx from "classnames";
import { Textfit } from "react-textfit";

import features from "../../../shared/features";
import { useIsHFU } from "../utils/useIsHFU";

export const ClassifierCell = ({ info, onClick, fallback, showScoring, division }) => {
  const isHFU = useIsHFU();

  const { name, code, scoring } = info || {};
  return (
    <div
      className={cx("flex flex-column", {
        "md:w-12rem": !features.major,
        "w-8rem": !features.major,
      })}
      style={onClick ? { cursor: "pointer" } : {}}
      onClick={() => {
        if (code) {
          onClick?.();
        }
      }}
    >
      <div className="flex flex-row justify-content-between">
        {!features.major && (
          <div className={cx("font-bold", { "text-color-secondary": !!code })}>
            {code || fallback}
          </div>
        )}
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
