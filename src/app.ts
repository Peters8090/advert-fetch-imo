import { dbInit, getAllOffers } from "./db";
import http from "http";
import { fetchNewOffers } from "./fetchNewOffers";

(async () => {
  await dbInit();

  await fetchNewOffers();

  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    const offers = await getAllOffers();
    res.end(JSON.stringify(offers));
  });
  server.listen(8080);
  console.log("Server is ready");
})();
