import latinize from "latinize";
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

export const removeMultipleSpaces = (str: string) =>
  str.replace(/ +(?= )/g, "");

// makes the text insensitive to: text casing, diacritic, order
export const convertToSearchRegex = (str: string) => {
  const onlyDiacritic = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"];

  str = removeMultipleSpaces(str);

  str = str
    .split("")
    .map((s) => {
      if (s === " ") {
        return s;
      }

      let chars = "";
      chars += s.toLowerCase();
      chars += s.toUpperCase();
      for (const diactriticLetter of onlyDiacritic) {
        if (
          latinize(s).toLowerCase() === latinize(diactriticLetter).toLowerCase()
        ) {
          chars += diactriticLetter.toLowerCase();
          chars += diactriticLetter.toUpperCase();
          chars += latinize(diactriticLetter).toLowerCase();
          chars += latinize(diactriticLetter).toUpperCase();
        }
      }
      return `[${chars}]`;
    })
    .join("");

  str = str
    .split(" ")
    .map((s) => `(?=.*${s})`)
    .join("");

  return str;
};
