type Numberish = number | string;

/** Number toFixed(2) float parser util */
export const N = (arg: Numberish, fix = 2) =>
  Number(parseFloat(arg as string).toFixed(fix));

export const HF = (arg: Numberish) => N(arg, 4);
export const Percent = (n: Numberish, total: number, fix?: number) =>
  N((100.0 * (n as number)) / total, fix);
export const PositiveOrMinus1 = (n: number) => (n >= 0 ? n : -1);
