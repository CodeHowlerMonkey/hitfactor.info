import Fastify from "fastify";
import App from "./app.js";

// DEPRECATED, use fastify cli instead
const start = async () => {
  const fastify = Fastify({ logger: true });
  try {
    await App(fastify);
    await fastify.listen({ port: process.env.PORT || 3333, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
