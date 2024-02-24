import { loadJSON } from "../utils.js";

export const all = [
  ...loadJSON("../../data/mergedArray.classifications.1.json"),
  ...loadJSON("../../data/mergedArray.classifications.2.json"),
];
