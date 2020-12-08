import fs from "promise-fs";
import sanitizeHTML from "sanitize-html";
import { IMPORTANT_DATA_FILE_PATH } from "./app";

export const expandedLog = (data: any) =>
  console.log(JSON.stringify(data, undefined, 2));

export const mkDirIfDoesntExist = async (fileName: string) => {
  try {
    await fs.mkdir(fileName);
  } catch (e) {}
};

export const doesFileExist = async (fileName: string) => {
  try {
    await fs.stat(fileName);
    return true;
  } catch (error) {
    return false;
  }
};

export const encodeToBase64 = (s: string): string =>
  Buffer.from(s).toString("base64");

export const sanitizeString = (str: string) => {
  str = sanitizeHTML(str);
  return str.trim();
};

export const getImportantData = async () =>
  JSON.parse(await fs.readFile(IMPORTANT_DATA_FILE_PATH, "utf8"));
