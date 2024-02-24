import { Tag } from "primereact/tag";
import { bgColorForClass, fgColorForClass } from "../utils/color";

export const ShooterCell = ({
  memberNumber,
  name,
  class: isthislikeawordorsomething, // breh
  onClick,
}) => (
  <div style={{ cursor: "pointer" }} onClick={onClick}>
    <div style={{ position: "relative" }}>
      {memberNumber}
      <Tag
        rounded
        severity="info"
        value={isthislikeawordorsomething}
        style={{
          backgroundColor: bgColorForClass[isthislikeawordorsomething],
          color: fgColorForClass[isthislikeawordorsomething],
          padding: "1px 4px",
          fontSize: "11px",
          margin: "auto",
          position: "absolute",
          transform: "translateX(4px)",
        }}
      />
    </div>
    <div style={{ fontSize: 14 }}>{name}</div>
  </div>
);

export default ShooterCell;
