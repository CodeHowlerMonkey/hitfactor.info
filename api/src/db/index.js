import { Sequelize, DataTypes } from "sequelize";
import { loadJSON } from "../utils.js";

const db = new Sequelize("sqlite::memory:", {
  logQueryParameters: false,
  logging: false,
});
const Member = await db.define(
  "Member",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    number: {
      type: DataTypes.STRING(16),
      unique: true,
    },
  },
  { timestamps: false }
);

export const initDb = async () => {
  const memberIdToNumberMap = loadJSON("../../data/meta/memberIdToNumber.json");
  await db.sync({ force: true });
  //  await Member.create({ id: 85193, number: "L5150" });
  const entries = Object.entries(memberIdToNumberMap)
    .map(([id, number]) => ({
      id: Number(id),
      number,
    }))
    .filter(({ id, number }) => !!id && !!number);
  await Member.bulkCreate(entries);
};

export const memberNumberForId = async (id) => {
  const row = await Member.findOne({ where: { id } });
  return row?.number;
};
