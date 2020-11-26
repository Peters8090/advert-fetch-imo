import { important_data } from "./important_data";
import {
  dbInit,
  dropAllAddedToDbFiles,
  dropAllOffers,
  getAllOffers,
} from "./db";
import http from "http";
import { fetchNewOffers, UNPACKED_ADVERTS_DIR } from "./fetchNewOffers";
import { scheduleJob } from "node-schedule";
import { resetEveryting } from "./resetEverything";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import bodyParser from "body-parser";
import { identity } from "lodash";
import { propertiesMappings } from "./propertiesMappings";
import { sanitizeString } from "./utility";

(async () => {
  await dbInit();

  if (important_data.isTest) {
    await resetEveryting();
  }

  const cronCallback = async () => {
    await fetchNewOffers();
    console.log(`Fetched new offers - ${new Date().toString()}`);
  };

  await cronCallback();

  scheduleJob(important_data.cronSchedule, cronCallback);
  const app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use(mongoSanitize());
  app.use(require("content-filter")());

  app.get("/", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const isAllowedValidators = {
      inList: (list: string[]) => (value: string) =>
        list.find((v) => v === value),
      isRange: () => (value: string) => {
        const res = /^\[([0-9]+)-([0-9]+)]$/.exec(value);
        if (!res) {
          return;
        }
        const [min, max] = [...res].slice(1).map((el) => +el);

        return {
          $gte: min,
          $lte: max,
        };
      },
      search: () => (value: string) => ({
        $regex: ".*" + sanitizeString(value) + ".*",
      }),
    };

    const filterList: {
      fieldName: string;
      isAllowed: (value: string) => any;
    }[] = [
      {
        fieldName: "property_type",
        isAllowed: (value: string) =>
          isAllowedValidators.inList([
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
    ];

    let chosenFilters: Record<string, any> = {};

    let error = false;
    for (const [name, value] of Object.entries(req.query)) {
      const foundFilter = filterList.find((f) => f.fieldName === name);
      if (foundFilter) {
        const res = foundFilter.isAllowed(`${value}`);
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
      res.end(JSON.stringify([]));
    } else {
      const offers = (await getAllOffers(chosenFilters)) as any[];
      res.writeHead(200);

      res.end(
        JSON.stringify(
          offers.map((el) =>
            Object.fromEntries(
              Object.entries(el.toObject())
                .filter(([key]) => propertiesMappings[key])
                .map(([key, value]) => {
                  if (!propertiesMappings[key]) console.log(key);

                  return [propertiesMappings[key] ?? key, value];
                })
            )
          )
        )
      );
    }
  });
  app.listen(8080);

  console.log("Server is ready");
})();
