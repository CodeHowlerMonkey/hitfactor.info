import mongoose from "mongoose";

const DQSchema = new mongoose.Schema(
  {
    memberNumber: String,
    lastName: String,
    firstName: String,
    division: String,
    upload: String,
    clubId: String,
    clubName: String,
    matchName: String,
    sd: Date,
    dq: String,
  },
  { strict: false }
);

DQSchema.index({ memberNumber: 1 });
DQSchema.index({ clubId: 1 });
DQSchema.index({ clubName: 1 });
DQSchema.index({ dq: 1 });

export const DQs = mongoose.model("DQ", DQSchema);
