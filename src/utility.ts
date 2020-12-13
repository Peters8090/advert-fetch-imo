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

const removeDiacritics = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const diactriticSafe = (str: string) => {
  const diactriticLetters = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"];

  const diactriticLettersCopy1 = [...diactriticLetters];
  for (const diactriticLetter of diactriticLettersCopy1) {
    diactriticLetters.push(removeDiacritics(diactriticLetter));
  }

  const diactriticLettersCopy2 = [...diactriticLetters];
  for (const diactriticLetter of diactriticLettersCopy2) {
    diactriticLetters.push(diactriticLetter.toUpperCase());
  }

  for (const diactriticLetter of diactriticLetters) {
    str = replaceAll(
      str,
      "((?!\\[).)" + diactriticLetter,
      `\1[${diactriticLetter}${removeDiacritics(diactriticLetter)}]`
    );
  }
  return str;
};
