import mongoose from "mongoose";

export interface DQ {
  memberNumber: string;
  lastName: string;
  firstName: string;
  division: string;
  upload: string;
  clubId: string;
  clubName: string;
  matchName: string;
  sd: Date;
  dq: string;
}

const DQSchema = new mongoose.Schema<DQ>({
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
});

DQSchema.index({ memberNumber: 1 });
DQSchema.index({ clubId: 1 });
DQSchema.index({ clubName: 1 });
DQSchema.index({ dq: 1 });

export const DQs = mongoose.model("DQs", DQSchema);
