import fs from "promise-fs";

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
