import mongoose, { Schema } from "mongoose";

export interface AfterUploadClassifier {
  classifierDivision: string;
  classifier: string;
  division: string;
}

const AfterUploadClassifierSchema = new Schema<AfterUploadClassifier>(
  {
    classifierDivision: String,
    classifier: String,
    division: String,
  },
  { strict: false },
);

export const AfterUploadClassifiers = mongoose.model(
  "AfterUploadClassifiers",
  AfterUploadClassifierSchema,
);
