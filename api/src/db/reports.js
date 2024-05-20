import mongoose from "mongoose";

const ReportShema = new mongoose.Schema(
  {
    sd: Date,
    memberNumber: String,
    division: String,
    classifier: String,
    hf: Number,
    recPercent: Number,
    percent: Number,
    clubid: String,
    club_name: String,

    url: String,
    reason: String,
    comment: String,
  },
  { strict: false }
);

export const Report = mongoose.model("Reports", ReportShema);
