"use strict";

import { config } from "dotenv";
import Fastify from "fastify";
import closeWithGrace from "close-with-grace";
import app from "./app.js";

config();
const fastify = Fastify({
  logger: true,
  pluginTimeout: 120000,
});
fastify.register(app);

//  no idea wtf this is needed, fastify
const closeListeners = closeWithGrace(
  { delay: process.env.FASTIFY_CLOSE_GRACE_DELAY || 500 },
  async function ({ signal, err, manual }) {
    if (err) {
      app.log.error(err);
    }
    await app.close();
  }
);
fastify.addHook("onClose", async (instance, done) => {
  closeListeners.uninstall();
  done();
});

fastify.listen({ port: process.env.PORT || 3000 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
