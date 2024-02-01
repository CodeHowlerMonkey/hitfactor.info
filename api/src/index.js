import Fastify from "fastify";
import FastifyStatic from "@fastify/static";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import _ from "lodash";
import path from "node:path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// import active from "../../data/merged.active.json" assert { type: "json" };

import classifications from "./classifications.api.js";
import {
  classifiers,
  classifierNumbers,
  basicInfoForClassifier,
  extendedInfoForClassifier,
  runsForDivisionClassifier,
} from "./classifiers.api.js";

const PAGE_SIZE = 100;

/**
 * Run the server!
 */
const start = async () => {
  const fastify = Fastify({ logger: true });
  try {
    // global settings
    await fastify.register(cors, { origin: "*" }); // IDGAF who uses this from where
    await fastify.register(compress);
    const pathReact = path.join(__dirname, "./../../web/dist/");
    const pathWsb = path.join(__dirname, "./../../data/classifiers/");

    // static: react app and downloads
    await fastify.register(FastifyStatic, {
      root: pathReact,
      prefix: "/",
    });
    fastify.setNotFoundHandler((req, reply) => reply.sendFile("index.html"));
    fastify.get("/wsb/:number", (req, reply) => {
      const { number } = req.params;
      // I'm paranoid and dont trust .includes lol
      const classifierNumber = classifierNumbers.find((c) => c === number);
      if (classifierNumber) {
        return reply.sendFile(classifierNumber + ".pdf", pathWsb);
      }
      return reply.redirect("/404");
    });

    // controllers
    fastify.get("/api/", async (request, reply) => ({
      query: request.query,
      mem_mb: process.memoryUsage().rss / 1024 / 1024,
    }));
    fastify.get(
      "/api/classifications",
      { compress: { threshold: 0 } },
      classifications
    );
    fastify.get("/api/classifiers", (req, res) =>
      classifiers.map(basicInfoForClassifier)
    );
    fastify.get("/api/classifiers/:division", (req, res) => {
      const { division } = req.params;
      return classifiers.map((c) => ({
        ...basicInfoForClassifier(c),
        ...extendedInfoForClassifier(c, division),
      }));
    });
    fastify.get("/api/classifiers/:division/:number", (req, res) => {
      const { division, number } = req.params;
      const { sort, order: orderString, page: pageString } = req.query;
      const order = Number(orderString) || -1;
      const page = Number(pageString) || 1;
      const c = classifiers.find((cur) => cur.classifier === number);

      if (!c) {
        res.statusCode = 404;
        return { info: null, runs: [] };
      }

      const basic = basicInfoForClassifier(c);
      const extended = extendedInfoForClassifier(c, division);
      const hhf = extended.hhf;

      return {
        info: {
          ...basic,
          ...extended,
        },
        runs: runsForDivisionClassifier({ number, division, hhf })
          // TODO: optional query param driven filter
          //.filter((r) => r.hf >= 0)
          .sort((a, b) => {
            if (!sort) {
              return b.hf - a.hf;
            }

            const orderMultiplier = Number(order) || -1;
            if (typeof a[sort] === "string") {
              return (
                orderMultiplier *
                (a[sort].toLowerCase() < b[sort].toLowerCase() ? 1 : -1)
              );
            }

            return orderMultiplier * (a[sort] - b[sort]);
          })
          .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      };
    });

    await fastify.listen({ port: process.env.PORT || 3333, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
