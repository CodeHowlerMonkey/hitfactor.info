const A = 1; //                1
const B = 1 << 4; //          16
const C = 1 << 8; //         256
const D = 1 << 12; //       4096
const NS = 1 << 16; //     65536
const M = 1 << 20; //    1048576
const NPM = 1 << 24; // 16777216

// Minor
const pointsA = 5;
const pointsCMinor = 3;
const pointsDMinor = 1;
const pointsMike = -10; // penalties only, -5 is missing alpha
const pointsNoShoot = -10;
const minorPointsForLetter = {
  A: pointsA,
  B: pointsCMinor,
  C: pointsCMinor,
  D: pointsDMinor,
  M: pointsMike,
  NS: pointsNoShoot,
  NPM: 0,
};

// Major
const pointsCMajor = 4;
const pointsDMajor = 2;
const majorPointsForLetter = {
  A: pointsA,
  B: pointsCMajor,
  C: pointsCMajor,
  D: pointsDMajor,
  M: pointsMike,
  NS: pointsNoShoot,
  NPM: 0,
};

export const targetHitsToLetters = (n) => {
  let remainder = n;

  const NPMs = Math.floor(remainder / NPM);
  remainder %= NPM;

  const Ms = Math.floor(remainder / M);
  remainder %= M;

  const NSs = Math.floor(remainder / NS);
  remainder %= NS;

  const Ds = Math.floor(remainder / D);
  remainder %= D;

  const Cs = Math.floor(remainder / C);
  remainder %= C;

  const Bs = Math.floor(remainder / B);
  remainder %= B;

  const As = remainder;

  return [
    ...new Array(As).fill("A"),
    ...new Array(Bs).fill("B"),
    ...new Array(Cs).fill("C"),
    ...new Array(Ds).fill("D"),
    ...new Array(Ms).fill("M"),
    ...new Array(NSs).fill("NS"),
    ...new Array(NPMs).fill("NPM"),
  ];
};

// 0.01 is very fuzzy, 0.0001 is ideal, TODO: pick 0.0001 unless 0.01 produces legit more eligible scores
export const fuzzyEqual = (a, b, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;

/** Calculates HF based off time/hits from the Score.
 * Returns -1 if existing HF doesnt match time/hits in Major or Minor
 */
export const minorHF = (score) => {
  try {
    const {
      hf,
      targetHits,
      strings,
      // penalties,
      steelHits,
      steelMikes,
      steelNS,
      // steelNPM,
    } = score;

    if (Number.isNaN(Number(hf))) {
      console.log("no hf" + score._id);
      return -1;
    }

    if (!Array.isArray(targetHits) || !Array.isArray(strings)) {
      console.log("bad hits/strings " + score._id);
      return -1;
    }

    let totalTime = Number(strings.reduce((acc, cur) => acc + cur));
    if (totalTime === 0) {
      totalTime = 1; // fixed time stage, HF = points
    }

    if (!totalTime) {
      console.log("bad strings " + score._id);
      return -1;
    }

    const steelPoints =
      (steelHits ?? 0) * pointsA +
      (steelMikes ?? 0) * pointsMike +
      (steelNS ?? 0) * pointsNoShoot;
    if (Number.isNaN(steelPoints)) {
      console.log("bad steel hits " + score._id);
      return -1;
    }

    if (hf === 0) {
      return 0;
    }

    const allHitsLetters = targetHits.map((h) => targetHitsToLetters(h)).flat();
    const majorTargetPoints = allHitsLetters
      .map((l) => majorPointsForLetter[l])
      .reduce((acc, cur) => acc + cur, 0);
    const minorTargetPoints = allHitsLetters
      .map((l) => minorPointsForLetter[l])
      .reduce((acc, cur) => acc + cur, 0);

    // TODO: (Issue #58) inconsistent penalties field in PS.
    // Could be mikes, could be procedurals. Fuck it.
    // const penaltiesPoints = Number(penalties) || 0;

    const majorHF = Number(
      ((majorTargetPoints + steelPoints + 0) / totalTime).toFixed(4)
    );
    const minorHF = Number(
      ((minorTargetPoints + steelPoints + 0) / totalTime).toFixed(4)
    );

    if (!fuzzyEqual(majorHF, hf) && !fuzzyEqual(minorHF, hf)) {
      console.log("bad math " + score._id);
      return -1;
    }

    return minorHF;
  } catch (e) {
    console.error(e);
  }
  console.log("something else " + score._id);

  return -1;
};
