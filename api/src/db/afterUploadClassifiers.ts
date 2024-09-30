import mongoose, { Schema } from "mongoose";

interface IAfterUploadClassifier {
  classifierDivision: string,
  classifier: string,
  division: string,
}

const AfterUploadClassifierSchema = new Schema<IAfterUploadClassifier>(
  {
    classifierDivision: String,
    classifier: String,
    division: String,
  },
  { strict: false }
);

export const AfterUploadClassifier = mongoose.model(
  "AfterUploadClassifier",
  AfterUploadClassifierSchema
);
