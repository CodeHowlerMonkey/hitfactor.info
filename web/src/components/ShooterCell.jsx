import { Tag } from "primereact/tag";

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

export const ShooterCell = ({ data, onClick }) => (
  <div style={{ cursor: "pointer" }} onClick={onClick}>
    <div>
      <ClassTag
        value={data?.recClass ?? "?"}
        tooltip={`Recommended: ${data?.reclassificationsRecPercentCurrent?.toFixed(2)}%`}
        style={{
          fontSize: "1em",
          padding: "0 0.5em",
          marginRight: "0.5em",
        }}
      />
      <span style={{ fontSize: "1.125em" }}>{data.name || data.shooterFullName}</span>
    </div>
  </div>
);

export default ShooterCell;
