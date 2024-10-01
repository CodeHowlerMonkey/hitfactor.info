import mongoose, { Schema } from "mongoose";

export interface AfterUploadShooter {
  memberNumberDivision: string;
  memberNumber: string;
  division: string;
  name: string;
}

const AfterUploadShooterSchema = new Schema<AfterUploadShooter>(
  {
    memberNumberDivision: String,
    memberNumber: String,
    division: String,
    name: String,
  },
  { strict: true },
);

export const AfterUploadShooters = mongoose.model(
  "AfterUploadShooters",
  AfterUploadShooterSchema,
);
