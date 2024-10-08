import mongoose, { ObjectId } from "mongoose";

export interface Report {
  sd: Date;
  memberNumber: string;
  division: string;
  classifier: string;
  hf: number;
  recPercent: number;
  percent: number;
  clubid: string;
  club_name: string;

  url: string;
  reason: string;
  comment: string;

  type: string;
  targetId: ObjectId;
}

const ReportShema = new mongoose.Schema<Report>({
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
  type: String,
  targetId: mongoose.Schema.ObjectId,
});

export const Reports = mongoose.model("Reports", ReportShema);
