import extract from "extract-zip";
import fs from "promise-fs";
import lodash from "lodash";
import { xml2js } from "xml-js";
import ncp from "copy-paste";

console.time();

type Element = {
  name?: string;
  text?: string;
  attributes?: Record<string, string>;
  type: "element" | "text";
  elements?: Element[];
};

type ConvertedXml = Element[];

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

      return xml2js(xmlContent).elements[0].elements as ConvertedXml;
    })
  );

  // ncp.copy(JSON.stringify(offerFileContentsNotAddedToDb[0]));

  const oferty: any[] = [];

  for (const [i, offer] of offerFileContentsNotAddedToDb.entries()) {
    if (i > 0) {
      // break;
    }

    const header = offer.find(({ name }) => name === "header");
    const lista_ofert = offer.find(({ name }) => name === "lista_ofert");
    const zdjecia = offer.find(({ name }) => name === "zdjecia");
    const zawartosc_pliku = header?.elements?.find(
      ({ name }) => name === "zawartosc_pliku"
    )?.elements?.[0]?.text as "calosc" | "roznica";

    lista_ofert?.elements?.forEach((dzial) => {
      const dzialAttributes = dzial.attributes as {
        tab: string;
        typ: string;
      };

      dzial?.elements?.forEach((oferta) => {
        const id = oferta.elements?.find(({ name }) => name === "id")
          ?.elements?.[0].text;
        const cenaEntry = oferta.elements?.find(({ name }) => name === "cena");
        const cena = {
          waluta: cenaEntry?.attributes?.waluta,
          value: cenaEntry?.elements?.[0].text,
        };

        const location = oferta?.elements
          ?.find(({ name }) => name === "location")
          ?.elements?.map((el) => el.elements?.[0].text)
          .reverse()
          .filter((_, i) => i !== 1)
          .join(", ");

        const params = oferta.elements
          ?.filter((el) => el.name === "param")
          .map((param) => [
            param.attributes?.nazwa,

            param.attributes?.nazwa === "opis"
              ? param.elements?.map((el) => el.elements?.[0].text).join("\n")
              : param.elements?.[0].text,
          ])
          .filter(([key]) => !["n_geo_x", "n_geo_y"].some((el) => el === key));

        console.log({
          id,
          cena,
          location,
          ...Object.fromEntries(params!),
          dzial: dzialAttributes,
        });
      });
    });
  }
  console.timeEnd();
})();
