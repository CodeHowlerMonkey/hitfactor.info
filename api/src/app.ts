import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import cors from "@fastify/cors";
import FastifyStatic from "@fastify/static";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";

import { connect } from "./db/index.js";
import { dirPath } from "./utils.js";

export interface AppOptions
  extends FastifyServerOptions,
    Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const FastifyAppEntry: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  await connect();

  // global settings
  await fastify.register(cors, { origin: "*" }); // IDGAF who uses this from where
  const pathReact = dirPath("./../../web/dist/");

  // static: react app in prod only (dev uses vite /api proxy)
  await fastify.register(FastifyStatic, {
    root: pathReact,
    prefix: "/",
  });
  await fastify.setNotFoundHandler((req, reply) => reply.sendFile("index.html"));

  // controllers
  await fastify.register(AutoLoad, {
    dir: dirPath("routes"),
    ignoreFilter: path => path.includes("/test/"),
    options: Object.assign({}, opts),
  });
};

export default FastifyAppEntry;
const app = FastifyAppEntry;
export { app, options };
