const rootRoutes = async fastify => {
  fastify.get("/mem", async request => ({
    query: request.query,
    mem_mb: process.memoryUsage().rss / 1024 / 1024,
  }));
};

export default rootRoutes;
