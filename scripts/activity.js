import { connect } from "../api/src/db/index.js";
import { Score } from "../api/src/db/scores.js";

const query = (amount) => [
  {
    $match: {
      $expr: {
        $gt: ["$sd", { $dateSubtract: { startDate: "$$NOW", unit: "month", amount } }],
      },
    },
  },
  { $group: { _id: "$memberNumber" } },
  { $count: "total" },
];

const totalUniqueScoresInLastXMonths = async (months) => {
  const { total } = await Score.aggregate(query(months));
};

const activity = async () => {
  await connect();

  const month = await Score.aggregate(query(1));
  const two = await Score.aggregate(query(2));
  const six = await Score.aggregate(query(6));
  const year = await Score.aggregate(query(12));
  const twoYears = await Score.aggregate(query(24));
  const threeYears = await Score.aggregate(query(36));

  console.log(
    JSON.stringify(
      {
        month,
        two,
        six,
        year,
        twoYears,
        threeYears,
      },
      null,
      2
    )
  );
};

activity();
