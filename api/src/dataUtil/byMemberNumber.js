export const byMemberNumber = (list) =>
  list.reduce((acc, c) => {
    if (!c?.memberNumber) {
      return acc;
    }
    acc[c.memberNumber] ??= [];
    acc[c.memberNumber].push(c);
    return acc;
  }, {});

export default byMemberNumber;
