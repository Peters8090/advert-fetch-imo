import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { scheduleJob } from "node-schedule";
import { dbInit, getAllOffers } from "./db";
import { fetchNewOffers } from "./fetchNewOffers";
import { propertiesMappings } from "./propertiesMappings";
import { resetEveryting } from "./resetEverything";
import {
  diactriticAndCaseSafeRegex,
  getImportantData,
  sanitizeString,
} from "./utility";

export const IMPORTANT_DATA_FILE_PATH = "importantData.json";

(async () => {
  await dbInit();

  const importantData = await getImportantData();

  if (importantData.isTest) {
    await resetEveryting();
  }

  const cronCallback = async () => {
    await fetchNewOffers();
    console.log(`Fetched new offers - ${new Date().toString()}`);
  };

  await cronCallback();

  scheduleJob(importantData.cronSchedule, cronCallback);
  const app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cors());
  app.use(mongoSanitize());
  app.use(require("content-filter")());
  app.use(express.static("public"));

  app.get("/", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const isAllowedValidators = {
      inList: (list: string[]) => (value: string) =>
        list.find((v) => v === value),
      isRange: () => (value: string) => {
        const res = /^\[([0-9.]+|null)-([0-9.]+|null)]$/.exec(value);
        if (!res) {
          return;
        }
        const [min, max] = [...res].slice(1);

        return {
          $gte: min === "null" ? -Infinity : +min,
          $lte: max === "null" ? Infinity : +max,
        };
      },
      search: () => (value: string) => ({
        $regex: ".*" + diactriticAndCaseSafeRegex(sanitizeString(value)) + ".*",
      }),
      normal: () => (value: string) => +sanitizeString(value),
    };

    const filterList: {
      fieldName: string;
      isAllowed: (value: string) => any;
    }[] = [
      {
        fieldName: "property_type",
        isAllowed: isAllowedValidators.inList([
          "mieszkania",
          "domy",
          "dzialki",
          "lokale",
        ]),
      },
      {
        fieldName: "transaction_type",
        isAllowed: isAllowedValidators.inList(["sprzedaz", "wynajem"]),
      },
      {
        fieldName: "price",
        isAllowed: isAllowedValidators.isRange(),
      },
      {
        fieldName: "powierzchnia",
        isAllowed: isAllowedValidators.isRange(),
      },
      {
        fieldName: "liczbapokoi",
        isAllowed: isAllowedValidators.isRange(),
      },
      {
        fieldName: "location",
        isAllowed: isAllowedValidators.search(),
      },
      {
        fieldName: "advertisement_text",
        isAllowed: isAllowedValidators.search(),
      },
      {
        fieldName: "page",
        isAllowed: isAllowedValidators.normal(),
      },
      {
        fieldName: "limit",
        isAllowed: isAllowedValidators.normal(),
      },
    ];

    const defaultFilters: Record<string, any> = {
      limit: 10,
    };
    let chosenFilters: Record<string, any> = {};

    let error = false;
    for (const [name, value] of Object.entries(req.query)) {
      const foundFilter = filterList.find((f) => f.fieldName === name);
      if (foundFilter) {
        const res = foundFilter.isAllowed(`${value}`);

        console.log(res);

        if (res) {
          chosenFilters[name] = res;
        } else {
          error = true;
        }
      } else {
        error = true;
      }
    }

    if (error) {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          docs: [],
          totalDocs: 0,
          limit: null,
          page: 1,
          totalPages: 1,
          pagingCounter: null,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })
      );
    } else {
      const resp = {
        ...((await getAllOffers({ ...defaultFilters, ...chosenFilters })) as {
          docs: any[];
        }),
      };

      const newDocs: any[] = new Array(resp.docs.length)
        .fill(null)
        .map(() =>
          Object.fromEntries(
            Object.entries(propertiesMappings).map(([key]) => [key, {}])
          )
        );

      resp.docs.forEach((offer, i) =>
        Object.entries(offer).forEach(([propertyName, propertyValue]) => {
          Object.entries(propertiesMappings).forEach(
            ([mappingGroup, mappingProperties]) => {
              if (mappingProperties[propertyName]) {
                newDocs[i][mappingGroup][
                  mappingProperties[propertyName]
                ] = propertyValue;
              }
            }
          );
        })
      );

      resp.docs = newDocs;

      res.writeHead(200);

      res.end(JSON.stringify(resp));
    }
  });
  app.listen(importantData.port);

  console.log("Server is ready");
})();
