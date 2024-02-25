const rootRoutes = async (fastify, opts) => {
  fastify.get("/mem", async (request, reply) => ({
    query: request.query,
    mem_mb: process.memoryUsage().rss / 1024 / 1024,
  }));
};

export default rootRoutes;
