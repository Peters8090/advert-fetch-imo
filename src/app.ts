import { dbInit, getAllAddedToDbFiles, getAllOffers } from "./db";
import http from "http";
import { fetchNewOffers } from "./fetchNewOffers";

(async () => {
  await dbInit();

  await fetchNewOffers();

  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    const offers = (await getAllOffers()) as any[];
    const addedToDb = (await getAllAddedToDbFiles()) as any[];
    res.end(JSON.stringify(offers));
    // res.end(JSON.stringify(addedToDb.length));
  });
  server.listen(8080);
  console.log("Server is ready");
})();
