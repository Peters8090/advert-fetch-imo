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

export const replaceAll = (
  str: string,
  find: string,
  replace: string
): string => {
  return str ? str.replace(new RegExp(find, "g"), replace) : "";
};

const onlyDiactritic = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ż", "ź"];

const removeDiacritics = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const diactriticSafe = (str: string) => {
  const diactriticLetters = [...onlyDiactritic];

  str = str
    .split("")
    .map((s) => {
      for (const diactriticLetter of diactriticLetters) {
        if (
          removeDiacritics(s).toLowerCase() ===
          removeDiacritics(diactriticLetter)
        ) {
          return `[${diactriticLetter}${removeDiacritics(
            diactriticLetter
          )}${diactriticLetter.toUpperCase()}${removeDiacritics(
            diactriticLetter
          ).toUpperCase()}]`;
        }
      }
      return s;
    })
    .join("");
  return str;
};
