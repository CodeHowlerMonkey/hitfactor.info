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
  <div style={{ cursor: "pointer", minWidth: "12em" }} onClick={onClick}>
    <div>
      <ClassTag
        value={data?.brutalClass ?? "?"}
        tooltip={`Brutal classification: ${data?.reclassificationsBrutalPercentCurrent?.toFixed(
          2
        )}%`}
      />
      <ClassTag
        value={data?.recClass ?? "?"}
        tooltip={`Rec. classification: ${data?.reclassificationsRecPercentCurrent?.toFixed(
          2
        )}%`}
      />
      <ClassTag
        value={data?.curHHFClass ?? "?"}
        alpha={0.65}
        tooltip={`Cur. HHF classification: ${data?.reclassificationsCurPercentCurrent?.toFixed(
          2
        )}%`}
      />
      <ClassTag
        value={data?.hqClass}
        alpha={0.45}
        tooltip={`HQ Classification: ${data?.current?.toFixed(2) ?? 0}%`}
      />
    </div>
    <div style={{ position: "relative" }}>
      <span style={{ marginRight: "4px" }}>{data.memberNumber}</span>
    </div>
    <div style={{ fontSize: "1.125em" }}>{data.name}</div>
  </div>
);

export default ShooterCell;
