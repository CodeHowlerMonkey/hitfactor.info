import { dirPath } from "../../utils";
import { classifierNumbers } from "../../dataUtil/classifiersData";
const pathWsb = dirPath("./../../data/classifiers/");

const wsbRoutes = async (fastify, opts) => {
  fastify.get("/:number", (req, reply) => {
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
};

export default wsbRoutes;
