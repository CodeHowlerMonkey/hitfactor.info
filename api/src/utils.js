import fs from "node:fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const dirPath = (...args) => path.join(__dirname, ...args);

export const loadJSON = (path) =>
  JSON.parse(fs.readFileSync(dirPath(path), "utf8"));

export const processImport = (dir, fileRegexp, forEachFileJSONCb) => {
  const files = fs
    .readdirSync(dirPath(dir))
    .filter((file) => !!file.match(fileRegexp));

  const filesToProcess = !process.env.QUICK_DEV ? files : files.slice(165, 170);

  filesToProcess.forEach((file) => {
    const curJSON = loadJSON(dir + "/" + file);
    curJSON.forEach(forEachFileJSONCb);
  });
};

export const processImportAsync = async (
  dir,
  fileRegexp,
  forEachFileJSONCb
) => {
  const files = fs
    .readdirSync(dirPath(dir))
    .filter((file) => !!file.match(fileRegexp));

  const filesToProcess = !process.env.QUICK_DEV
    ? files
    : files.slice(files.length - 4, files.length);

  for (const file of filesToProcess) {
    const curJSON = loadJSON(dir + "/" + file);
    await Promise.all(curJSON.map(forEachFileJSONCb));
  }
};

export const lazy = (resolver) => {
  let _result = null;

  return () => {
    if (_result) {
      return _result;
    }

    _result = resolver();
    return _result;
  };
};

export const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
