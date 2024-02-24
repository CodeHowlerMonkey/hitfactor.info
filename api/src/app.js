import FastifyStatic from "@fastify/static";
import AutoLoad from "@fastify/autoload";
import compress from "@fastify/compress";
import cors from "@fastify/cors";

import { dirPath } from "./utils.js";

const FastifyAppEntry = async (fastify, opts) => {
  // global settings
  await fastify.register(cors, { origin: "*" }); // IDGAF who uses this from where
  await fastify.register(compress);
  const pathReact = dirPath("./../../web/dist/");
  const pathWsb = dirPath("./../../data/classifiers/");

  // static: react app in prod only (dev uses vite /api proxy)
  console.log(process.env.NODE_ENV);
  if (process.env.NODE_ENV !== "development") {
    console.log("using fastifystatic for react");
    await fastify.register(FastifyStatic, {
      root: pathReact,
      prefix: "/",
    });
    fastify.setNotFoundHandler((req, reply) => reply.sendFile("index.html"));
  } else {
    console.log("NO STATIC");
  }

  // controllers
  fastify.register(AutoLoad, {
    dir: dirPath("routes"),
    options: Object.assign({}, opts),
  });
};

export default FastifyAppEntry;
