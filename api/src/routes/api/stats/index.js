import { Percent } from "../../../dataUtil/numbers";
import { uspsaDivisionsPopularity } from "../../../db/scores";

const _divisionsPopularityCached = {};
const statsRoutes = async fastify => {
  fastify.get("/divisions", async req => {
    return { disabled: 1 };
    const year = Number(req.query.year) || 0;
    let data = _divisionsPopularityCached[year];
    if (!data) {
      data = await uspsaDivisionsPopularity(year);
      _divisionsPopularityCached[year] = data;
    }

    const total = data.reduce((acc, cur) => acc + cur.scores, 0);

    const dataWithPercent = data.map(cur => {
      cur.percent = Percent(cur.scores, total);
      return cur;
    });

    return { data: dataWithPercent, total };
  });
};

export default statsRoutes;
