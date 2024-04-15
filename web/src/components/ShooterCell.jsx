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
          padding: "1px 4px",
          fontSize: "11px",
          margin: "0 1px",
          minWidth: "18px",
          opacity: alpha,
        }}
      />
    </span>
  );

export const ShooterCell = ({ data, onClick }) => (
  <div style={{ cursor: "pointer" }} onClick={onClick}>
    <div style={{ position: "relative" }}>
      <span style={{ marginRight: "4px" }}>{data.memberNumber}</span>
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
        value={data?.class}
        alpha={0.45}
        tooltip={`HQ Classification: ${data?.current?.toFixed(2) ?? 0}%`}
      />
    </div>
    <div style={{ fontSize: 14 }}>{data.name}</div>
  </div>
);

export default ShooterCell;
