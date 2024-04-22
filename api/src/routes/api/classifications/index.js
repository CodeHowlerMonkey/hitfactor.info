import { Stats } from "../../../db/stats.js";

const classificationsRoutes = async (fastify, opts) => {
  fastify.get("/", async (req, res) => {
    return Stats.findOne({}).lean();
  });
};

export default classificationsRoutes;
