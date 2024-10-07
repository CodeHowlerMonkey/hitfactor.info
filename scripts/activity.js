import { connect } from "../api/src/db/index";
import { Scores } from "../api/src/db/scores";

const query = amount => [
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

const totalUniqueScoresInLastXMonths = async months => {
  const { total } = await Scores.aggregate(query(months));
};

const activity = async () => {
  await connect();

  const month = await Scores.aggregate(query(1));
  const two = await Scores.aggregate(query(2));
  const six = await Scores.aggregate(query(6));
  const year = await Scores.aggregate(query(12));
  const twoYears = await Scores.aggregate(query(24));
  const threeYears = await Scores.aggregate(query(36));

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
      2,
    ),
  );
};

activity();
