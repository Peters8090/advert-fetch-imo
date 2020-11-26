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
import { mkDirIfDoesntExist } from "./utility";

export const UNPACKED_ADVERTS_DIR = "adverts_unpacked";
const PACKED_ADVERTS_DIR = "adverts_packed";
const PHOTOS_DIR = "photos";
const OFFERS_XML_FILENAME = "oferty.xml";

export const fetchNewOffers = async () => {
  await mkDirIfDoesntExist(PACKED_ADVERTS_DIR);
  await mkDirIfDoesntExist(UNPACKED_ADVERTS_DIR);

  let filesToUnpack: string[] = lodash.difference(
    await fs.readdir(PACKED_ADVERTS_DIR),
    await fs.readdir(UNPACKED_ADVERTS_DIR)
  );

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
      const propertyType = dzial?.attributes?.tab;
      const transactionType = dzial?.attributes?.typ;

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

          const currency = cenaEntry?.attributes?.waluta;
          const price = +cenaEntry?.elements?.[0].text?.replace(",", ".")!;

          const locationProperties = [
            ...new Set(
              oferta?.elements
                ?.find(({ name }) => name === "location")
                ?.elements?.map((el) => el.elements?.[0].text)
                .reverse()
            ),
          ];
          const location = locationProperties.join(", ");

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

          const generatedTitle = (() => {
            const singularPropertyType = (() => {
              switch (propertyType) {
                case "mieszkania":
                  return "mieszkanie";
                case "domy":
                  return "dom";
                case "dzialki":
                  return "działka";
                case "lokale":
                  return "lokal";
              }
            })();
            const area = params?.find(([key]) => key === "powierzchnia")?.[1];
            const city = locationProperties[0];

            const capitalizeFirstLetter = (text: string) =>
              text.charAt(0).toUpperCase() + text.slice(1);

            return capitalizeFirstLetter(
              [singularPropertyType, area + " m²", city].join(", ")
            );
          })();

          const newOffer = Object.fromEntries(
            Object.entries({
              imoId: id,
              currency,
              price,
              location,
              ...Object.fromEntries(params!),
              property_type: propertyType,
              transaction_type: transactionType,
            } as Record<string, any>).map(([key, el]) => {
              let newEl = el;
              if (el) {
                if (+el) {
                  newEl = +el;
                } else if (+el.replace(",", ".")) {
                  newEl = +el.replace(",", ".");
                }
                if (el === "true") {
                  newEl = "tak";
                } else if (el === "false") {
                  newEl = "nie";
                }
              }
              return [key, newEl];
            })
          );

          if (!newOffer.advertisement_text) {
            newOffer.advertisement_text = generatedTitle;
          }

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
