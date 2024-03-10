import { StaticPool } from "node-worker-threads-pool";

const staticPool = new StaticPool({
  size: 8,
  task: async ([c, field]) => {
    const { calculateUSPSAClassification } = await import(
      "../shared/utils/classification.js" // worker imports from node process root, /api in this case
    );
    return calculateUSPSAClassification(c, field);
  },
});

export const calculateUSPSAClassificationMT = async (c, field) =>
  await staticPool.exec([c, field]);
