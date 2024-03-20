import FastifyStatic from "@fastify/static";
import AutoLoad from "@fastify/autoload";
import cors from "@fastify/cors";

import { dirPath } from "./utils.js";

const FastifyAppEntry = async (fastify, opts) => {
  // global settings
  await fastify.register(cors, { origin: "*" }); // IDGAF who uses this from where
  const pathReact = dirPath("./../../web/dist/");

  // static: react app in prod only (dev uses vite /api proxy)
  await fastify.register(FastifyStatic, {
    root: pathReact,
    prefix: "/",
  });
  fastify.setNotFoundHandler((req, reply) => reply.sendFile("index.html"));

  // controllers
  fastify.register(AutoLoad, {
    dir: dirPath("routes"),
    ignoreFilter: (path) => path.includes("/test/"),
    options: Object.assign({}, opts),
  });
};

export default FastifyAppEntry;
