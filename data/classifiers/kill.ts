import { uniq } from "lodash";

const pcc = [
  "09-09 Lightning And Thunder",
  "99-14 Hoser Heaven",
  "09-01 Six In Six Challenge",
  "03-14 Baseball Standards",
  "18-06 For That Day",
  "08-01 4 Bill Drill",
  "09-07 It's Not Brain Surgery",
  "09-14 Eye Of The Tiger",
  "13-02 Down The Middle",
  "19-03 HI'er Love",
  "03-04 3-V",
  "09-02 Diamond Cutter",
  "99-63 Merles Standards",
];

const co = [
  "18-06 For That Day",
  "99-61 Sit Or Get Off The Shot",
  "08-01 4 Bill Drill",
  "99-63 Merles Standards",
  "99-47 Triple Choice",
  "99-14 Hoser Heaven",
  "09-07 It's Not Brain Surgery",
  "09-03 Oh No",
  "18-02 What Is With You People",
  "13-02 Down The Middle",
  "13-03 Short Sprint Standards",
  "03-11 El Strong & Weak Pres",
  "18-01 Of Course It Did",
  "09-14 Eye Of The Tiger",
  "03-02 Six Chickens",
  "99-07 Both Sides Now #1",
  "03-14 Baseball Standards",
  "09-13 Table Stakes",
  "03-04 3-V",
  "09-02 Diamond Cutter",
  "99-48 Tight Squeeze",
  "19-03 HI'er Love",
  "09-04 Pucker Factor",
  "13-08 More Disaster Factor",
  "13-01 Disaster Factor",
  "18-04 Didn’t You Send The Mailman",
  "99-57 Bookouts Boogie",
  "13-07 Double Deal 2",
  "06-02 Big Barricade II",
  "09-08 Crackerjack",
];

export const killList = uniq([...pcc, ...co]);
export const killListCodes = killList.map(c => c.split(" ")[0]);
