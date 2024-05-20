import { Report } from "../../../db/reports.js";

const classificationsRoutes = async (fastify, opts) => {
  fastify.post("/", async (req, res) => {
    const {
      sd,
      memberNumber,
      division,
      classifier,
      hf,
      url,
      reason,
      comment,
      recPercent,
      percent,
      clubid,
      club_name,
    } = req.body || {};

    const result = await Report.create({
      sd,
      memberNumber,
      division,
      classifier,
      hf,
      url,
      reason,
      comment,
      recPercent,
      percent,
      clubid,
      club_name,
    });

    return { id: result?._id };
  });
};

export default classificationsRoutes;
