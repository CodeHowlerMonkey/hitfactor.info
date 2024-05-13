import { Percent } from "../../../dataUtil/numbers.js";
import { divisionsPopularity } from "../../../db/scores.js";

const _divisionsPopularityCached = {};
const statsRoutes = async (fastify, opts) => {
  fastify.get("/divisions", async (req, res) => {
    const year = Number(req.query.year) || 0;
    let data = _divisionsPopularityCached[year];
    if (!data) {
      data = await divisionsPopularity(year);
      _divisionsPopularityCached[year] = data;
    }

    const total = data.reduce((acc, cur) => {
      acc += cur.scores;
      return acc;
    }, 0);

    const dataWithPercent = data.map((cur) => {
      cur.percent = Percent(cur.scores, total);
      return cur;
    });

    return { data: dataWithPercent, total };
  });
};

export default statsRoutes;
