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
import { shootersTable } from "./dataUtil/shooters.js";

import {
  classifiers,
  classifierNumbers,
  basicInfoForClassifier,
  extendedInfoForClassifier,
  runsForDivisionClassifier,
  chartData,
} from "./classifiers.api.js";
import { multisort } from "../../shared/utils/sort.js";

const PAGE_SIZE = 100;

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
      const { preview } = req.query;
      // I'm paranoid and dont trust .includes lol
      const classifierNumber = classifierNumbers.find((c) => c === number);
      if (classifierNumber) {
        if (!preview) {
          return reply.sendFile(classifierNumber + ".pdf", pathWsb);
        }

        return reply.sendFile(classifierNumber + ".jpg", pathWsb);
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
      //console.profile();
      const { division } = req.params;
      const result = classifiers.map((c) => ({
        ...basicInfoForClassifier(c),
        ...extendedInfoForClassifier(c, division),
      }));
      //console.profileEnd();
      return result;
    });
    fastify.get("/api/classifiers/:division/:number/chart", (req, res) => {
      const { division, number } = req.params;
      const { full } = req.query;
      return chartData({ division, number, full });
    });
    fastify.get("/api/shooters/:division", (req, res) => {
      const { division } = req.params;
      const { sort, order, page: pageString } = req.query;
      const page = Number(pageString) || 1;

      const data = multisort(
        shootersTable[division],
        sort?.split?.(","),
        order?.split?.(",")
      ).map((run, index) => ({ ...run, index }));

      return {
        shooters: data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        shootersTotal: data.length,
        shootersPage: page,
      };
    });
    fastify.get("/api/classifiers/:division/:number", (req, res) => {
      const { division, number } = req.params;
      const {
        sort,
        order,
        page: pageString,
        legacy,
        hhf: filterHHFString,
        club: filterClubString,
        filter: filterString,
      } = req.query;
      const includeNoHF = Number(legacy) === 1;
      const page = Number(pageString) || 1;
      const filterHHF = parseFloat(filterHHFString);
      const c = classifiers.find((cur) => cur.classifier === number);

      if (!c) {
        res.statusCode = 404;
        return { info: null, runs: [] };
      }

      const basic = basicInfoForClassifier(c);
      const extended = extendedInfoForClassifier(c, division);
      const { hhf, hhfs } = extended;

      let runsUnsorted = runsForDivisionClassifier({
        number,
        division,
        hhf,
        includeNoHF,
        hhfs,
      });
      if (filterHHF) {
        runsUnsorted = runsUnsorted.filter(
          (run) => Math.abs(filterHHF - run.historicalHHF) <= 0.00015
        );
      }
      if (filterString) {
        runsUnsorted = runsUnsorted.filter((run) =>
          [run.clubid, run.club_name, run.memberNumber, run.name]
            .join("###")
            .toLowerCase()
            .includes(filterString.toLowerCase())
        );
      }
      if (filterClubString) {
        runsUnsorted = runsUnsorted
          .filter((run) => run.clubid === filterClubString)
          .slice(0, 10);
      }
      const runs = multisort(
        runsUnsorted,
        sort?.split?.(","),
        order?.split?.(",")
      ).map((run, index) => ({ ...run, index }));

      return {
        info: {
          ...basic,
          ...extended,
        },
        runs: runs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        runsTotal: runs.length,
        runsPage: page,
      };
    });

    await fastify.listen({ port: process.env.PORT || 3333, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
