const clubsRoutes = async (fastify, opts) => {
  fastify.get("/", (req, res) => 'Clubs!')
}

export default clubsRoutes;