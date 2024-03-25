import { lazy, processImport } from "../../../utils.js";

const clubsRoutes = async (fastify) => {
  fastify.get("/", () => {
    return getMemoizedClubs();
  })
}

const getClubs = () => {
  const result = [];
  const clubDict = {};

  processImport(
    "../../data/imported",
    /classifiers\.\d+\.json/,
    ({ value = {} }) => {
      const { classifiers = [] } = value
      for (const { division_classifiers = {} } of classifiers) {
        for (const { clubid, club_name } of division_classifiers) {
          if (clubid && club_name) { clubDict[clubid] = club_name }
        }
      }
    }
  );
  Object.keys(clubDict).forEach(function(key) {
    result.push({ id: key, name: clubDict[key] })
  })
  return result;
}

const getMemoizedClubs = lazy(getClubs)

export default clubsRoutes;