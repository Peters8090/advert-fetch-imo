import { dbInit, getAllOffers } from "./db";
import http from "http";
import { fetchNewOffers } from "./fetchNewOffers";

console.time();

dbInit();

fetchNewOffers().then(() => console.timeEnd());

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  const offers = await getAllOffers();
  res.end(JSON.stringify(offers));
});
server.listen(8080);
