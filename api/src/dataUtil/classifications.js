import fs from "node:fs";
import { dirPath } from "../utils.js";
const one = "../../data/mergedArray.classifications.1.json";
const two = "../../data/mergedArray.classifications.2.json";

// using readFile instead of import to reduce memory footprint
const oneFile = fs.readFileSync(dirPath(one), "utf8");
const twoFile = fs.readFileSync(dirPath(two), "utf8");
export const all = [...JSON.parse(oneFile), ...JSON.parse(twoFile)];
