import http from "http";
import { fetchNewOffers } from "./fetchNewOffers";

console.time();

const addedToDbFiles: string[] = [];
let offers: Record<string, string>[] = [];

fetchNewOffers(offers, addedToDbFiles).then(() => console.timeEnd());

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify(offers));
});
server.listen(8080);
