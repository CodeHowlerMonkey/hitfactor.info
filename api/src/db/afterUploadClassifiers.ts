import mongoose, { Schema } from "mongoose";

export interface AfterUploadClassifier {
  classifierDivision: string;
  classifier: string;
  name?: string;
  division: string;
}

const AfterUploadClassifierSchema = new Schema<AfterUploadClassifier>(
  {
    classifierDivision: String,
    classifier: String,
    name: String,
    division: String,
  },
  { strict: false },
);

export const AfterUploadClassifiers = mongoose.model(
  "AfterUploadClassifiers",
  AfterUploadClassifierSchema,
);
