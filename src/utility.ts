import fs from "promise-fs";
import sanitizeHTML from "sanitize-html";

export const expandedLog = (data: any) =>
  console.log(JSON.stringify(data, undefined, 2));

export const mkDirIfDoesntExist = async (fileName: string) => {
  try {
    await fs.mkdir(fileName);
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
};

export const encodeToBase64 = (s: string): string =>
  Buffer.from(s).toString("base64");

export const sanitizeString = (str: string) => {
  str = sanitizeHTML(str);
  return str.trim();
};
