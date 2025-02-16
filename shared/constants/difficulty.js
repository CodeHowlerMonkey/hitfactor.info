export const weibullDifficulty = {
  percentile: 3,
  percent: 90,
};

export const classificationDifficulty = {
  // TODO: pick difficulty windows for majors depending on number of stages and hardcoded ratio?
  window: {
    min: 4,
    best: 6,
    recent: 8,
  },

  percentCap: 110,
};
