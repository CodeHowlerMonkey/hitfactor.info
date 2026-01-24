export * from "./useTablePagination";
export * from "./useTableSort";

// TODO: move utils table here

export const renderPercentDiff = (c, { field }) => {
  const value = c[field];
  if ([undefined, NaN, null].includes(value)) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
};

export const iconForDifficulty = p => {
  if (p >= 104) {
    return "💀💀💀";
  }
  if (p >= 98) {
    return "💀💀";
  }
  if (p >= 92) {
    return "💀";
  }
  if (p >= 88) {
    return "🤕";
  }
  if (p >= 85) {
    return "😢";
  }
  if (p >= 80) {
    return "😤";
  }
  if (p >= 75) {
    return "😮‍💨";
  }
  if (p >= 70) {
    return "🙂";
  }
  if (p >= 65) {
    return "🙂🙂";
  }
  if (p >= 40) {
    return "🙂🙂🙂";
  }

  return "N/A";
};

export const letterRatingForPercent = p => {
  if (p >= 95) {
    return "AAA";
  }
  if (p >= 92) {
    return "AA";
  }
  if (p >= 90) {
    return "A";
  }
  if (p >= 88) {
    return "A-";
  }
  if (p >= 85) {
    return "B+";
  }
  if (p >= 80) {
    return "B";
  }
  if (p >= 77) {
    return "B-";
  }
  if (p >= 70) {
    return "C+";
  }
  if (p >= 65) {
    return "C";
  }
  if (p >= 62) {
    return "C-";
  }
  if (p >= 59) {
    return "C--";
  }
  if (p >= 50) {
    return "F+";
  }
  if (p >= 40) {
    return "F";
  }
  if (p >= 30) {
    return "FF";
  }
  return "FFF";
};

export const renderPercentNoZero = (c, { field }, transform = asIs => asIs) => {
  let value = c[field];
  if (value < 0 || !value) {
    return "—";
  }

  if (typeof value !== "number") {
    value = Number(value);
  }
  value = transform(value);

  return `${value.toFixed(2)}%`;
};

export const renderPercent = (c, { field }, transform = asIs => asIs, toFixed = 2) => {
  let value = c[field];
  if (value < 0 || value === undefined) {
    return "—";
  }

  if (typeof value !== "number") {
    value = Number(value);
  }
  value = transform(value);

  return `${value.toFixed(toFixed)}%`;
};

export const renderPercentAndAge = (c, { field }) => {
  if (!c[field]) {
    return "—";
  }
  let age = Number(c[`${field}Age`]) || 999;
  if (age >= 999) {
    age = "N/A";
  } else {
    age = `${age.toFixed(0)}mo`;
  }
  return `${renderPercent(c, { field })} (${age})`;
};

export const renderMatchLevel = (c, { field }) => {
  switch (c[field]) {
    case 4:
      return "IV";
    case 3:
    case 2:
    case 1:
      return new Array(c.level).fill("I").join("");

    default:
      return "—";
  }
};

export const renderPercentAllowNegative = (c, { field }) => {
  let value = c[field];
  if (value === undefined) {
    return "—";
  }

  if (typeof value !== "number") {
    value = Number(value);
  }

  return `${value.toFixed(2)}%`;
};

export const renderHFOrNA = (c, { field }) => {
  let value = c[field];
  if (value < 0 || value === undefined || value === null) {
    return "—";
  }

  if (typeof value !== "number") {
    value = Number(value);
  }

  return value.toFixed(4);
};

export const renderClubIdMatchLink = (c, { field }) => {
  const content = c[field] || "";
  if (c.upload) {
    const title = `${content}\n${c.matchName || ""}`;
    const contentShort = content.split(" ").slice(0, 2).join(" ");
    const matchNameShort = (c.matchName || "")
      .split(" ")
      .slice(0, 4)
      .map(s => s?.[0])
      .filter(Boolean)
      .join("");
    return (
      <a href={`/pslink/${c.upload}`} target="_blank" title={title} rel="noreferrer">
        {contentShort || matchNameShort}
      </a>
    );
  }

  return content;
};

export const headerTooltipOptions = {
  position: "top",
  style: { maxWidth: "300px" },
};

export const clubMatchColumn = {
  field: "clubid",
  header: "Club / Match",
  sortable: true,
  showFilterMenu: false,
  body: (c, { field }) => {
    const clubText = renderClubIdMatchLink(c, { field });
    return (
      <span
        style={{
          overflow: "hidden",
          display: "inline-block",
          maxWidth: "4em",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {clubText}
      </span>
    );
  },
};
