import { Reports } from "../../../db/reports";

const reportRoutes = async fastify => {
  fastify.post("/", async req => {
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

    const result = await Reports.create({
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

export default reportRoutes;
