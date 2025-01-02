import coElo from "../../../data/elo/co.json";
import ltdElo from "../../../data/elo/lim.json";
import loElo from "../../../data/elo/lo.json";
import opnElo from "../../../data/elo/open.json";
import pccElo from "../../../data/elo/pcc.json";
import prodElo from "../../../data/elo/prod.json";
import revElo from "../../../data/elo/revo.json";
import ssElo from "../../../data/elo/ss.json";

const divEloByMemberNumber = divElo =>
  divElo.reduce((acc, c, index, all) => {
    acc[c.memberNumber] = { ...c, elo: c.rating, eloRank: (100 * index) / all.length };
    return acc;
  }, {});

const eloByDivisionByMemberNumber = {
  opn: divEloByMemberNumber(opnElo),
  co: divEloByMemberNumber(coElo),
  lo: divEloByMemberNumber(loElo),
  pcc: divEloByMemberNumber(pccElo),
  ltd: divEloByMemberNumber(ltdElo),
  l10: divEloByMemberNumber(ltdElo), // placeholder, no l10 ELO available
  prod: divEloByMemberNumber(prodElo),
  ss: divEloByMemberNumber(ssElo),
  rev: divEloByMemberNumber(revElo),
};

interface ELOPoint {
  memberNumber: string;
  ogMemberNumber: string;
  name: string;
  rating: number;
}

export const eloPointForShooter = (
  division: string,
  memberNumber: string,
): ELOPoint | null => {
  if (!division || !memberNumber) {
    return null;
  }

  const ogMemberNumber = memberNumber;
  const normalizedMemberNumber = memberNumber.replace(/^(A|TY|FY|FYF|F|TYF|CA)/gi, "");
  const jsonInfo = eloByDivisionByMemberNumber[division]?.[normalizedMemberNumber];
  if (!jsonInfo) {
    return null;
  }

  return {
    ...jsonInfo,
    memberNumber: normalizedMemberNumber,
    ogMemberNumber,
    division,
  };
};
