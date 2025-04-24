import { Tag } from "primereact/tag";

import { classForPercent } from "../../../shared/utils/classification";
import { bgColorForClass, fgColorForClass } from "../utils/color";

const tagStyle = (value, color) => ({
  backgroundColor: bgColorForClass[value],
  color: color ?? fgColorForClass[value],
  padding: "0.075em 0.35em",
  fontSize: "0.85em",
  fontWeight: "normal",
  margin: "0 0.35em 0 0",
  minWidth: "1.285em",
});

const ClassTag = ({ value, tooltip }) =>
  !value ? null : (
    <Tag
      title={tooltip || ""}
      rounded
      severity="info"
      value={value}
      style={tagStyle(value)}
    />
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
    <div className="max-w-max">
      {sport === "hfu" && (
        <ClassTag
          value={data?.recClass ?? "?"}
          tooltip={`Recommended: ${data?.reclassificationsRecPercentCurrent?.toFixed(
            2,
          )}%`}
        />
      )}
      {(!sport || sport === "uspsa") && (
        <ClassTag
          value={classForPercent(data?.reclassificationsRecPercentUncappedHigh)}
          tooltip={`Recommended High: ${data?.reclassificationsRecPercentUncappedHigh?.toFixed(
            2,
          )}%`}
        />
      )}
      <span style={{ fontSize: "0.85em" }}>{data.memberNumber}</span>
      <DivisionNameIfNeeded sport={sport} division={data?.originalDivision} />
    </div>
    <div style={{ fontSize: "1.125em" }}>{data.name || data.shooterFullName}</div>
  </div>
);

export default ShooterCell;
