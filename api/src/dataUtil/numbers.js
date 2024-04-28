/** Number toFixed(2) float parser util */
export const N = (arg, fix = 2) => Number(parseFloat(arg).toFixed(fix));

export const HF = (arg) => N(arg, 4);
export const Percent = (n, total, fix) => N((100.0 * n) / total, fix);
export const PositiveOrMinus1 = (n) => (n >= 0 ? n : -1);
