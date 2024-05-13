import { Tag } from "primereact/tag";
import { bgColorForClass, fgColorForClass } from "../utils/color";

const ClassTag = ({ value, alpha, tooltip }) =>
  !value ? null : (
    <span title={!value ? "Unknown Class" : tooltip || ""}>
      <Tag
        data-pr-tooltip="No notifications"
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
        }}
      />
    </span>
  );

export const ShooterCell = ({ data, onClick }) => (
  <div style={{ cursor: "pointer" }} className="max-w-max" onClick={onClick}>
    <div className="max-w-max">
      <ClassTag
        value={data?.recClass ?? "?"}
        tooltip={`Recommended: ${data?.reclassificationsRecPercentCurrent?.toFixed(2)}%`}
      />
      <ClassTag
        value={data?.curHHFClass ?? "?"}
        alpha={0.65}
        tooltip={`Current HHF: ${data?.reclassificationsCurPercentCurrent?.toFixed(2)}%`}
      />
      <ClassTag
        value={data?.hqClass}
        alpha={0.45}
        tooltip={`HQ: ${data?.current?.toFixed(2) ?? 0}%`}
      />
    </div>
    <div className="max-w-max">{data.memberNumber}</div>
    <div style={{ fontSize: "1.125em" }}>{data.name}</div>
  </div>
);

export default ShooterCell;
