const sharedEnv = (() => {
  try {
    return import.meta.env || process.env || {};
  } catch (all) {}
  return {};
})();

const features = {
  hfu: true,
  users: false,
  scsaOnly: false,
  major: !!sharedEnv.VITE_FEATURES_MAJOR,
};

export default features;
