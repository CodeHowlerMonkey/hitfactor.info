import { connect } from "../api/src/db/index";
import { scoresForRecommendedClassification } from "../api/src/db/shooters";

// should not crash, "testcase" for 7.0 vs 7.3 $getField behavior
const go = async () => {
  await connect();

  const scores = await scoresForRecommendedClassification(["TY93975"]);

  console.log(JSON.stringify(scores, null, 2));
};

go();
