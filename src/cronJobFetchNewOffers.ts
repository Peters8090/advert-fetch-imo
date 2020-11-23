import { fetchNewOffers } from "./fetchNewOffers";
import { dbInit } from "./db";
dbInit().then(() => {
  fetchNewOffers();
});
