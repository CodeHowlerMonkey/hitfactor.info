/* eslint-disable no-console */

// legacy, unsupported, extracted from uploads.ts and kept in case someone
// wants to take over SCSA in HFI fork

import { UTCDate } from "../../../shared/utils/date";
import {
  scsaDivisionWithPrefix,
  scsaPeakTime,
  ScsaPeakTimesMap,
} from "../dataUtil/classifiersData";
import { HF, N, Percent } from "../dataUtil/numbers";

import { EmptySingleMatchResultFactory, fetchPS } from "./uploadsCommon";

export const scsaMatchInfo = async matchInfo => {
  const { uuid } = matchInfo;

  // Unlike USPSA, SCSA does not have results.json.
  const { matchDef: match, scores: scoresJson } = await fetchPS(matchInfo.uuid, {
    skipResults: true,
  });
  if (!match || !scoresJson) {
    return EmptySingleMatchResultFactory(match);
  }
  /*
    match_penalties Structure:
    [{
      "pen_warn": false,
      "pen_bin": false,
      "pen_name": "Procedural",
      "pen_val": 3
    }]
   */
  try {
    const { match_shooters, match_stages, match_penalties } = match;
    const shootersMap = Object.fromEntries(match_shooters.map(s => [s.sh_uuid, s.sh_id]));
    const shootersDivisionMap = Object.fromEntries(
      match_shooters.map(s => [s.sh_uuid, s.sh_dvp]),
    );
    match.memberNumberToNamesMap = Object.fromEntries(
      match_shooters.map(s => [s.sh_id, [s.sh_fn, s.sh_ln].filter(Boolean).join(" ")]),
    );
    const classifiersMap = Object.fromEntries(
      match_stages
        .filter(s => !!s.stage_classifiercode)
        .map(s => [s.stage_uuid, s.stage_classifiercode]),
    );

    const { match_scores } = scoresJson;
    const stageScoresMap = match_scores.reduce((acc, cur) => {
      const curStage = acc[cur.stage_uuid] || {};
      cur.stage_stagescores.forEach(cs => {
        curStage[cs.shtr] = cs;
      });
      acc[cur.stage_uuid] = curStage;
      return acc;
    }, {});

    const scores = match_scores
      .filter(ms => {
        const { stage_uuid } = ms;
        const classifierCode = classifiersMap[stage_uuid];
        return (
          classifiersMap[stage_uuid] !== undefined && classifierCode.match(/SC-10[0-8]/g)
        );
      })
      .map(ms => {
        const { stage_uuid, stage_stagescores } = ms;
        const classifier = classifiersMap[stage_uuid];

        return stage_stagescores
          .filter(ss => {
            const divisionCode = shootersDivisionMap[ss.shtr]?.toUpperCase();
            return (
              divisionCode !== undefined &&
              Object.keys(ScsaPeakTimesMap).find(div => div === divisionCode) !==
                undefined
            );
          })
          .filter(ss => {
            const expectedNumStrings = classifier === "SC-104" ? 4 : 5;
            const strings = ss.str;
            // Exclude any score where the string count does not match
            // the official string count for the stated classifier.
            return strings.length === expectedNumStrings;
          })
          .map(ss => {
            // str is the array of all strings for the stage
            // e.g. [7, 5.46, 6.17, 23.13]
            const strings = ss.str;

            // penss is a two-dimensional array of the COUNT of all penalties, by index, on the stage.
            // e.g.
            //[
            //  [
            //    1,
            //    0,
            //    0,
            //    0
            //  ]
            const pens = ss.penss || [];
            const penaltyCount = pens.flat().reduce((p, c) => p + c, 0);
            const detailedScores = stageScoresMap[stage_uuid]?.[ss.shtr] || {};

            const adjustedStrings = strings
              .map((s, idx) => {
                try {
                  const penCountsForString = pens[idx];
                  // Multiply the count of each penalties by their value, and sum the result.
                  const totalStringPenalties = (penCountsForString || []).reduce(
                    (p, c, penIdx) => p + c * (match_penalties[penIdx]?.pen_val || 0),
                    0,
                  );
                  const adjustedStringTotal = s + totalStringPenalties;
                  // Strings max out at 30 seconds in SCSA.
                  return Math.min(30, adjustedStringTotal);
                } catch (e) {
                  console.log(`bad SCSA match: ${uuid}`);
                  throw e;
                }
              })
              .sort((a, b) => b - a);

            const memberNumber = shootersMap[ss.shtr]?.toUpperCase();
            const divisionCode = shootersDivisionMap[ss.shtr]?.toUpperCase();
            const division = scsaDivisionWithPrefix(divisionCode);

            const modifiedDate = new Date(detailedScores.mod);
            const modified = Number.isNaN(modifiedDate.getTime())
              ? undefined
              : modifiedDate;

            // Worst string (front of the array) dropped.
            const bestNStrings = adjustedStrings.slice(1);

            const stageTotal = N(bestNStrings.reduce((p, c) => p + c, 0));

            const pseudoHf = HF((25 * bestNStrings.length) / stageTotal);

            const classifierPeakTime = scsaPeakTime(divisionCode, classifier);
            const shooterFullName = match.memberNumberToNamesMap[memberNumber];
            const classificationPercent = Percent(classifierPeakTime, stageTotal);

            return {
              stageTimeSecs: stageTotal,
              stagePeakTimeSecs: classifierPeakTime,

              penalties: penaltyCount,

              // from algolia / matches collection
              type: matchInfo?.type,
              subType: matchInfo?.subType,
              templateName: matchInfo?.templateName,

              // from /match_scores.json
              modified,
              strings: adjustedStrings,
              targetHits: detailedScores.ts,
              device: detailedScores.dname,
              bad: classificationPercent >= 175.0,
              hf: pseudoHf,
              percent: classificationPercent,
              shooterFullName,
              memberNumber,
              classifier,
              division,
              upload: uuid,
              clubid: match.match_clubcode,
              club_name: match.match_clubname || match.match_name,
              matchName: match.match_name,
              sd: UTCDate(match.match_date),
              code: "N",
              source: "Stage Score",
              memberNumberDivision: [memberNumber, division].join(":"),
              classifierDivision: [classifier, division].join(":"),
            };
          });
      })
      .flat()
      .filter(
        r =>
          r.strings.every(x => x > 0) &&
          r.stageTimeSecs > 0 &&
          !!r.memberNumber &&
          !!r.classifier &&
          !!r.division &&
          !!r.memberNumberDivision,
      );

    return { scores, match, results: [] };
  } catch (e) {}

  return EmptySingleMatchResultFactory(match);
};
