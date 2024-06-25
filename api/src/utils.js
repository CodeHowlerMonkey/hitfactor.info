import fs from "node:fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const dirPath = (...args) => path.join(__dirname, ...args);

export const loadJSON = (path) => JSON.parse(fs.readFileSync(dirPath(path), "utf8"));

const filesToProcess = (dir, fileRegexp) => {
  const files = fs.readdirSync(dirPath(dir)).filter((file) => !!file.match(fileRegexp));

  if (process.env.LOCAL_DEV) {
    const last = files[files.length - 1];
    return [last];
  }

  return files;
};

export const processImport = (dir, fileRegexp, forEachFileJSONCb) => {
  filesToProcess(dir, fileRegexp).forEach((file) => {
    const curJSON = loadJSON(dir + "/" + file);
    curJSON.forEach(forEachFileJSONCb);
  });
};

export const processImportAsync = async (dir, fileRegexp, forEachFileJSONCb) => {
  const files = filesToProcess(dir, fileRegexp);
  for (const file of files) {
    const curJSON = loadJSON(dir + "/" + file);
    await Promise.all(curJSON.map(forEachFileJSONCb));
  }
};

export const processImportAsyncSeq = async (dir, fileRegexp, forEachFileJSONCb) => {
  const files = filesToProcess(dir, fileRegexp);
  for (const file of files) {
    const curJSON = loadJSON(dir + "/" + file);
    for (const obj of curJSON) {
      await forEachFileJSONCb(obj);
    }
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
