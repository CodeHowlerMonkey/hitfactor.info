import { Stats } from "../../../db/stats";

const classificationsRoutes = async (fastify, opts) => {
  fastify.get("/", async (req, res) => Stats.findOne({}).lean());
};

export default classificationsRoutes;
