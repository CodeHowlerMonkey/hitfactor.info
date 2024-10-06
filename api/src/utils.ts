import fs from "node:fs";
import path from "node:path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const dirPath = (...args) => path.join(__dirname, ...args);

export const loadJSON = filePath =>
  JSON.parse(fs.readFileSync(dirPath(filePath), "utf8"));

const filesToProcess = (dir, fileRegexp) => {
  const files = fs.readdirSync(dirPath(dir)).filter(file => !!file.match(fileRegexp));

  if (process.env.LOCAL_DEV) {
    const last = files[files.length - 1];
    return [last];
  }

  return files;
};

export const processImportAsyncSeq = async (
  dir: string,
  fileRegexp: RegExp,
  forEachFileJSONCb: (obj: any) => Promise<void>,
) => {
  const files = filesToProcess(dir, fileRegexp);
  for (const file of files) {
    const curJSON = loadJSON(`${dir}/${file}`);
    for (const obj of curJSON) {
      await forEachFileJSONCb(obj);
    }
  }
};

export const lazy = resolver => {
  let _result = null;

  return () => {
    if (_result) {
      return _result;
    }

    _result = resolver();
    return _result;
  };
};

export const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
