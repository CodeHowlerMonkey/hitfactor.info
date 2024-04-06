import mongoose from "mongoose";

import { Score } from "./scores.js";
import { recommendedHHFFor } from "../dataUtil/recommendedHHF.js";

const RecHHFSchema = new mongoose.Schema({
  classifier: String,
  division: String,
  recHHF: Number,
});

RecHHFSchema.index({ classifier: 1, division: 1 }, { unique: true });

export const RecHHF = mongoose.model("RecHHF", RecHHFSchema);

export const hydrateRecHHF = async () => {
  RecHHF.collection.drop();
  console.log("hydrating recommended HHFs");
  console.time("recHHFs");
  const divisions = (await Score.find().distinct("division")).filter(Boolean);
  const classifers = (await Score.find().distinct("classifier")).filter(
    Boolean
  );
  console.log(
    `Divisions: ${divisions.length}, Classifiers: ${classifers.length}`
  );

  let i = 1;
  const total = divisions.length * classifers.length;
  for (const division of divisions) {
    for (const classifier of classifers) {
      const recHHF = await recommendedHHFFor({ division, number: classifier });
      await Promise.all([
        RecHHF.create({ division, classifier, recHHF }),
        Score.updateMany({ division, classifier }, { recHHF }),
      ]);
      process.stdout.write(`\r${i}/${total}`);
      ++i;
    }
  }

  console.timeEnd("recHHFs");
};
