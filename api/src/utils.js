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

  const filesToProcess = !process.env.QUICK_DEV
    ? files
    : files.slice(files.length - 4, files.length);

  filesToProcess.forEach((file) => {
    const curJSON = loadJSON(dir + "/" + file);
    curJSON.forEach(forEachFileJSONCb);
  });
};

export const lazy = (resolver, cachePath) => {
  let _result = null;

  return () => {
    if (_result) {
      return _result;
    } /*else if (cachePath) {
      try {
        const cached = loadJSON(cachePath);
        if (cached) {
          console.log("using cached " + cachePath);
          _result = cached;
          return _result;
        }
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(err);
        }
      }
    }*/

    /*
    console.log("resolving new " + cachePath);
    */
    _result = resolver();
    /*
    if (cachePath) {
      console.log("saving cache " + cachePath);
      saveJSON(cachePath, _result);
    }*/
    return _result;
  };
};
