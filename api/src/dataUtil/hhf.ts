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

export const divShortToNewHHFs: Record<string, Record<string, number>> = loadJSON(
  "../../data/uspsa-hhfs-march-25.json",
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

export const oldHHFForDivisionClassifier = ({
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
    console.error(`cant find Old HHF for ${number}:${division}`);
    console.error(division);
    return -1;
  }
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

  const c = classifiers.find(cur => cur.classifier === number);

  // major match or classifier not found for some reason
  if (!c) {
    return NaN;
  }

  try {
    return HF(divShortToNewHHFs[division]?.[number] || -1);
  } catch (all) {
    console.error(`cant find New HHF for ${number}:${division}`);
    return -1;
  }
};
