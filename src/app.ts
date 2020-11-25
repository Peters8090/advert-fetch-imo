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

  app.get("/", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    const offers = (await getAllOffers()) as any[];
    res.end(JSON.stringify(offers));
  });
  app.listen(8080);
  console.log("Server is ready");
})();
