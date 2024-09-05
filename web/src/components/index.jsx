export * from "./chart";
export * from "./DivisionNavigation";
export * from "./RunsTable";
export * from "./UnderConstruction";

export const Row = ({ children }) => (
  <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
    {children}
  </div>
);

export const Column = ({ children }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >
    {children}
  </div>
);
