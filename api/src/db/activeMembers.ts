import mongoose from "mongoose";

export type ClassificationLetter = "U" | "D" | "C" | "B" | "A" | "M" | "GM";

export interface ActiveMember {
  generated: Date;
  memberId: number;

  expires: Date;

  co: ClassificationLetter;
  l10: ClassificationLetter;
  lo: ClassificationLetter;
  ltd: ClassificationLetter;
  opn: ClassificationLetter;
  pcc: ClassificationLetter;
  prod: ClassificationLetter;
  rev: ClassificationLetter;
  ss: ClassificationLetter;
}

const ActiveMemberShema = new mongoose.Schema<ActiveMember>({
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
});

ActiveMemberShema.index({ generated: 1, memberId: 1 }, { unique: true });
ActiveMemberShema.index({ generated: -1, memberId: 1 });
ActiveMemberShema.index({ generated: 1, memberId: -1 });
ActiveMemberShema.index({ generated: -1, memberId: -1 });

export const ActiveMembers = mongoose.model("ActiveMembers", ActiveMemberShema);

export const saveActiveMembersFromPSClassUpdate = async psClassUpdate =>
  ActiveMembers.bulkWrite(
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
