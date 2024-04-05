import FastifyStatic from "@fastify/static";
import AutoLoad from "@fastify/autoload";
import cors from "@fastify/cors";
import mongoose from "mongoose";

import { dirPath } from "./utils.js";
import { connect, hydrate, testModels } from "./db/index.js";

const FastifyAppEntry = async (fastify, opts) => {
  // global settings
  await fastify.register(cors, { origin: "*" }); // IDGAF who uses this from where
  const pathReact = dirPath("./../../web/dist/");

  // static: react app in prod only (dev uses vite /api proxy)
  await fastify.register(FastifyStatic, {
    root: pathReact,
    prefix: "/",
  });
  await fastify.setNotFoundHandler((req, reply) =>
    reply.sendFile("index.html")
  );

  // controllers
  await fastify.register(AutoLoad, {
    dir: dirPath("routes"),
    ignoreFilter: (path) => path.includes("/test/"),
    options: Object.assign({}, opts),
  });

  await connect();
  await hydrate();
  await testModels();
};

export default FastifyAppEntry;
