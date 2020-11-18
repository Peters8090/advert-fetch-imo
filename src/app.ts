import extract from "extract-zip";
import fs from "promise-fs";
import lodash from "lodash";
import { xml2js } from "xml-js";

console.time();

type Element = {
  name?: string;
  text?: string;
  type: "element" | "text";
  elements?: Element[];
};
const expandedLog = (data: any) =>
  console.log(JSON.stringify(data, undefined, 2));

(async () => {
  const UNPACKED_ADVERTS_DIR = "adverts_unpacked";
  const PACKED_ADVERTS_DIR = "adverts_packed";

  let filesToUnpack: string[] = [];
  try {
    filesToUnpack = lodash.difference(
      await fs.readdir(PACKED_ADVERTS_DIR),
      await fs.readdir(UNPACKED_ADVERTS_DIR)
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const packedFile of filesToUnpack) {
    await extract(`${process.cwd()}/${PACKED_ADVERTS_DIR}/${packedFile}`, {
      dir: `${process.cwd()}/${UNPACKED_ADVERTS_DIR}/${packedFile}`,
    });
  }

  let unpackedFiles = await fs.readdir(UNPACKED_ADVERTS_DIR);

  const asyncFilter = async <T>(
    arr: T[],
    predicate: (el: T) => Promise<boolean>
  ) => {
    const results = await Promise.all(arr.map(predicate));

    return arr.filter((_v, index) => results[index]);
  };

  const ADDED_TO_DB_FILE_NAME = "added-to-db.txt";

  const unpackedFilesNotAddedToDb = await asyncFilter(
    unpackedFiles,
    async (unpackedFile) => {
      return !(
        await fs.readdir(`${UNPACKED_ADVERTS_DIR}/${unpackedFile}`)
      ).includes(ADDED_TO_DB_FILE_NAME);
    }
  );

  unpackedFilesNotAddedToDb.sort();

  console.log(unpackedFilesNotAddedToDb);

  const OFFERS_XML_FILENAME = "oferty.xml";

  const offerFileContentsNotAddedToDb = await Promise.all(
    unpackedFilesNotAddedToDb.map(async (file) => {
      const xmlContent = (
        await fs.readFile(
          `${UNPACKED_ADVERTS_DIR}/${file}/${OFFERS_XML_FILENAME}`
        )
      ).toString();

      return xml2js(xmlContent).elements as Element[];
    })
  );

  expandedLog(offerFileContentsNotAddedToDb);

  // console.log(JSON.stringify(offerFileContentsNotAddedToDb[0], null, 2));

  // for (const unpackedFile of unpackedFilesNotAddedToDb) {
  //   //   fs.writeFile(
  //   //     `${UNPACKED_ADVERTS_DIR}/${unpackedFile}/${ADDED_TO_DB_FILE_NAME}`,
  //   //     "yes"
  //   //   );
  // }
  console.timeEnd();
})();
