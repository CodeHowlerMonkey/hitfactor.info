import mongoose from "mongoose";
import { Score, hydrateScores } from "./scores.js";
import { hydrateRecHHF } from "./recHHF.js";
import { recommendedHHFFor } from "../dataUtil/recommendedHHF.js";
import { Shooter, hydrateShooters } from "./shooters.js";

export const connect = async () => {
  await mongoose.connect(process.env.MONGO_URL);
};

export const hydrate = async () => {
  const test = await Shooter.findOne({ memberNumber: "L1234" });
  console.log(JSON.stringify(test.toObject({ virtuals: true }), null, 2));
  return;

  await hydrateScores();
  await hydrateRecHHF();
  await hydrateShooters();

  console.log("hydration done");
};

export const testModels = async () => {
  const whateverSchema = new mongoose.Schema({}, { strict: false });

  const Whatever1Model = mongoose.model("Whatever1", whateverSchema);
  const Whatever2Model = mongoose.model("Whatever2", whateverSchema);

  const w1 = new Whatever1Model({ a: 1, b: 2, c: 3 });
  await w1.save();

  const w2 = new Whatever1Model({ a: 2, b: "4 as a string", c: 6, d: 8 });
  await w2.save();

  const w3 = new Whatever2Model({ foo: "bar" });
  await w3.save();

  const two = await Whatever1Model.find();
  const one = await Whatever2Model.find();
  console.log(JSON.stringify({ two, one }, null, 2));
};
