import mongoose, { Schema } from "mongoose";

interface IAfterUploadShooter {
  memberNumberDivision: string,
  memberNumber: string,
  division: string
  name: string
}

const AfterUploadShooterSchema = new Schema<IAfterUploadShooter>(
  {
    memberNumberDivision: String,
    memberNumber: String,
    division: String,
    name: String,
  },
  { strict: true }
);

export const AfterUploadShooter = mongoose.model(
  "AfterUploadShooter",
  AfterUploadShooterSchema
);
