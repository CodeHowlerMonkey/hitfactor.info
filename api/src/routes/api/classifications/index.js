import { Stats } from "../../../db/stats";

const classificationsRoutes = async fastify => {
  fastify.get("/", async () => Stats.findOne({}).lean());
};

export default classificationsRoutes;
