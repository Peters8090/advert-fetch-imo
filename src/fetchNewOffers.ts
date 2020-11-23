import extract from "extract-zip";
import fs from "promise-fs";
import lodash from "lodash";
import { xml2js } from "xml-js";
import {
  addAddedToDbFile,
  addOffer,
  updateOffer,
  dropAllOffers,
  findOffer,
  getAllAddedToDbFiles,
  removeOffer,
} from "./db";

export const fetchNewOffers = async () => {
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

  const addedToDbFiles = ((await getAllAddedToDbFiles()) as {
    fileName: string;
  }[]).map((el) => el.fileName);

  const unpackedFilesNotAddedToDb = unpackedFiles.filter(
    (file) => !addedToDbFiles.includes(file)
  );

  unpackedFilesNotAddedToDb.sort();

  const OFFERS_XML_FILENAME = "oferty.xml";

  type Element = {
    name?: string;
    text?: string;
    attributes?: Record<string, string>;
    type: "element" | "text";
    elements?: Element[];
  };

  type ConvertedXml = Element[];

  const offerFileContentsNotAddedToDb = await Promise.all(
    unpackedFilesNotAddedToDb.map(async (file) => {
      const xmlContent = (
        await fs.readFile(
          `${UNPACKED_ADVERTS_DIR}/${file}/${OFFERS_XML_FILENAME}`
        )
      ).toString();

      return [file, xml2js(xmlContent).elements[0].elements] as [
        string,
        ConvertedXml
      ];
    })
  );

  for (const [fileName, xmlContent] of offerFileContentsNotAddedToDb) {
    const header = xmlContent.find(({ name }) => name === "header");
    const lista_ofert = xmlContent.find(({ name }) => name === "lista_ofert");
    const zdjecia = xmlContent.find(({ name }) => name === "zdjecia");
    const zawartosc_pliku = header?.elements?.find(
      ({ name }) => name === "zawartosc_pliku"
    )?.elements?.[0]?.text as "calosc" | "roznica";

    if (zawartosc_pliku === "calosc") {
      await dropAllOffers();
    }

    for (const dzial of lista_ofert?.elements!) {
      const dzialAttributes = dzial.attributes as {
        tab: string;
        typ: string;
      };

      if (dzial?.elements) {
        for (const oferta of dzial!.elements!) {
          const id = oferta.elements?.find(({ name }) => name === "id")
            ?.elements?.[0].text;

          if (oferta.name === "oferta_usun") {
            await removeOffer(id!);
            break;
          }

          const cenaEntry = oferta.elements?.find(
            ({ name }) => name === "cena"
          );
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
            .filter(
              ([key]) => !["n_geo_x", "n_geo_y"].some((el) => el === key)
            );

          const newOffer = {
            imoId: id,
            cena,
            location,
            ...Object.fromEntries(params!),
            dzial: dzialAttributes,
          };

          const foundOffer = id ? await findOffer(id!) : null;
          if (foundOffer) {
            await updateOffer(id!, newOffer);
          } else {
            await addOffer(newOffer);
          }
        }
      }
    }

    await addAddedToDbFile(fileName);
  }
};
