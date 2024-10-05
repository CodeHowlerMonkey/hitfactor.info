import mongoose from "mongoose";

const ActiveMemberShema = new mongoose.Schema(
  {
    // Primary Key
    generated: Date,
    memberId: Number,

    expires: Date,

    co: String,
    l10: String,
    lo: String,
    ltd: String,
    opn: String,
    pcc: String,
    prod: String,
    rev: String,
    ss: String,
  },
  { strict: false },
);

ActiveMemberShema.index({ generated: 1, memberId: 1 }, { unique: true });
ActiveMemberShema.index({ generated: -1, memberId: 1 });
ActiveMemberShema.index({ generated: 1, memberId: -1 });
ActiveMemberShema.index({ generated: -1, memberId: -1 });

export const ActiveMember = mongoose.model("ActiveMembers", ActiveMemberShema);

export const saveActiveMembersFromPSClassUpdate = async psClassUpdate =>
  ActiveMember.bulkWrite(
    psClassUpdate.map(({ generated, memberId, ...fields }) => ({
      updateOne: {
        filter: { generated, memberId },
        update: {
          $set: { generated, memberId, ...fields },
        },
        upsert: true,
      },
    })),
  );
