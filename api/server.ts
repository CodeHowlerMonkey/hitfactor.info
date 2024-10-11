import closeWithGrace from "close-with-grace";
import * as dotenv from "dotenv";
import Fastify from "fastify";

import FastifyAppEntry from "./src/app";

dotenv.config();

const app = Fastify({
  logger: true,
});

app.register(FastifyAppEntry, { logLevel: "info" });

// delay is the number of milliseconds for the graceful close to finish
const closeListeners = closeWithGrace({ delay: 1500 }, async ({ err }) => {
  if (err) {
    app.log.error(err);
  }
  await app.close();
});

app.addHook("onClose", async () => {
  closeListeners.uninstall();
});

app.listen({ port: parseInt(process.env.PORT || "3000"), host: "0.0.0.0" }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
