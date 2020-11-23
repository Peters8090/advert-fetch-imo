import { important_data } from "./important_data";
import { dbInit, getAllOffers } from "./db";
import http from "http";
import { fetchNewOffers } from "./fetchNewOffers";
import { scheduleJob } from "node-schedule";

(async () => {
  await dbInit();

  const cronCallback = async () => {
    await fetchNewOffers();
    console.log(`Fetched new offers - ${new Date().toString()}`);
  };

  await cronCallback();

  scheduleJob(important_data.cronSchedule, cronCallback);

  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    const offers = (await getAllOffers()) as any[];
    res.end(JSON.stringify(offers));
  });
  server.listen(8080);
  console.log("Server is ready");
})();
