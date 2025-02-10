import { Tag } from "primereact/tag";

import features from "../../../shared/features";
import { classForPercent } from "../../../shared/utils/classification";
import { bgColorForClass, fgColorForClass } from "../utils/color";

const ClassTag = ({ value, alpha, tooltip, style }) =>
  !value ? null : (
    <span title={!value ? "Unknown Class" : tooltip || ""}>
      <Tag
        className=".shooter-class-tag"
        rounded
        severity="info"
        value={value}
        style={{
          backgroundColor: bgColorForClass[value],
          color: fgColorForClass[value],
          padding: "0.0715em 0.285em",
          fontSize: "0.785em",
          margin: "0 0.0715em",
          minWidth: "1.285em",
          opacity: alpha,
          ...style,
        }}
      />
    </span>
  );

const DivisionNameIfNeeded = ({ division, sport }) =>
  sport !== "hfu" || !division ? null : (
    <span
      style={{
        marginLeft: 4,
        fontSize: "0.60em",
        verticalAlign: "super",
      }}
    >
      ({division.toUpperCase()})
    </span>
  );

export const ShooterCell = ({ data, onClick, sport }) => (
  <div style={{ cursor: "pointer" }} className="max-w-max" onClick={onClick}>
    {(!sport || sport === "uspsa") && (
      <div className="max-w-max">
        <ClassTag
          value={classForPercent(data?.reclassificationsRecPercentUncappedHigh)}
          tooltip={`Recommended: ${data?.reclassificationsRecPercentUncappedHigh?.toFixed(
            2,
          )}% / ${data?.reclassificationsRecPercentUncappedCurrent?.toFixed(2)}%`}
        />
        {!features.major && (
          <ClassTag
            value={classForPercent(data?.reclassificationsCurPercentHigh)}
            alpha={0.65}
            tooltip={`Current HHF: ${data?.reclassificationsCurPercentHigh?.toFixed(2)}% / ${data?.reclassificationsCurPercentCurrent?.toFixed(2)}%`}
          />
        )}
        <ClassTag
          value={data?.hqClass}
          alpha={0.45}
          tooltip={`HQ: ${data?.current?.toFixed(2) ?? 0}%`}
        />
      </div>
    )}
    <div className="max-w-max">
      {sport === "hfu" && (
        <ClassTag
          value={data?.recClass ?? "?"}
          tooltip={`Recommended: ${data?.reclassificationsRecPercentCurrent?.toFixed(
            2,
          )}%`}
          style={{
            fontSize: "1em",
            padding: "0 0.25em",
            marginRight: "0.25em",
          }}
        />
      )}
      {data.memberNumber}
      <DivisionNameIfNeeded sport={sport} division={data?.originalDivision} />
    </div>
    <div style={{ fontSize: "1.125em" }}>{data.name || data.shooterFullName}</div>
  </div>
);

export default ShooterCell;
