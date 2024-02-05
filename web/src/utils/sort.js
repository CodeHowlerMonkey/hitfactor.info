export const numSort = (a, b, field, order) => order * (a[field] - b[field]);

export const stringSort = (a, b, field, order) => {
  if (a[field].toLowerCase() > b[field].toLowerCase()) {
    return order;
  } else {
    return -order;
  }
};

export const dateSort = (a, b, field, order) => {
  return order * (new Date(a[field]).getTime() - new Date(b[field]).getTime());
};

// converts classifier code to sortable number, taking thee actual meaning behind first two
// digits (year) into account. For example 03-02 will be converted to 200302
const fullCodeNum = (code) =>
  Number(((code.startsWith("99") ? "19" : "20") + code).replace("-", ""));

export const classifierCodeSort = (a, b, field, order) =>
  sortState.sortOrder * (fullCodeNum(a.code) - fullCodeNum(b.code));

const singleFieldSort = (a, b, field, order) => {
  switch (field) {
    case "sd":
      return dateSort(a, b, field, order);

    default:
      if (typeof a[field] === "string") {
        return stringSort(a, b, field, order);
      } else {
        return numSort(a, b, field, order);
      }
  }
};

// TODO: move this somewhere more useful, maybe refactor for
// better more generalized sorting shit can be moved to sort utils too
export const sortClassifiers = (data = [], fields, orders) =>
  !fields?.length
    ? data
    : data.sort((a, b) => {
        for (const methodIndex in fields) {
          const field = fields[methodIndex];
          const orderString = orders[methodIndex];
          const order = Number(orderString) || -1;

          const sortResult = singleFieldSort(a, b, field, order);
          if (sortResult === 0) {
            continue;
          }

          return sortResult;
        }

        return 0;
      });
