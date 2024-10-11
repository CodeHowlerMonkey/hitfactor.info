import { HHFJSON, USPSAHHFJSON, USPSAHHFJSONDivision } from "../../../data/types/USPSA";
import { loadJSON } from "../utils";

import {
  classifiers,
  SCSADivision,
  scsaHhfEquivalentForDivision,
} from "./classifiersData";
import { divIdToShort, hfuDivisionMapForHHF } from "./divisions";
import { HF } from "./numbers";

export const divShortToHHFs: Record<USPSAHHFJSONDivision, USPSAHHFJSON[]> = loadJSON(
  "../../data/hhf.json",
).hhfs.reduce(
  (acc: Record<USPSAHHFJSONDivision, USPSAHHFJSON[]>, cur: USPSAHHFJSON) => {
    const divShortName = divIdToShort[cur.division!];
    const curArray = acc[divShortName] || [];

    return {
      ...acc,
      [divShortName]: [...curArray, cur],
    };
  },
  {} as Record<USPSAHHFJSONDivision, USPSAHHFJSON[]>,
);

export const hhfsForDivision = (division: string): HHFJSON[] => {
  if (division.startsWith("scsa")) {
    return scsaHhfEquivalentForDivision(division as SCSADivision);
  }
  const hfuDivisionForHHF = hfuDivisionMapForHHF[division];
  if (hfuDivisionForHHF) {
    return divShortToHHFs[hfuDivisionForHHF];
  }

  return divShortToHHFs[division];
};

export const curHHFForDivisionClassifier = ({
  division,
  number,
}: {
  division: string;
  number: string;
}) => {
  if (!number) {
    return NaN;
  }

  const divisionHHFs = hhfsForDivision(division);
  const c = classifiers.find(cur => cur.classifier === number);

  // major match or classifier not found for some reason
  if (!c) {
    return NaN;
  }

  try {
    const curHHFInfo = divisionHHFs.find(dHHF => dHHF.classifier === c.id);
    return HF(curHHFInfo!.hhf);
  } catch (all) {
    console.error("cant find HHF for division:");
    console.error(division);
    return -1;
  }
};
