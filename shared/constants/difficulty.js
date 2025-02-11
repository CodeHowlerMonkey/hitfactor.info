export const weibullDifficulty = {
  percentile: 3,
  percent: 90,
};

export const classificationDifficulty = {
  // TODO: pick difficulty windows for majors depending on number of stages and hardcoded ratio?
  window: {
    min: 6,
    best: 6,
    recent: 20,
  },

  percentCap: 110,
};
