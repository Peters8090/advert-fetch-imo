import fs from "promise-fs";
import { dropAllAddedToDbFiles, dropAllOffers } from "./db";
import { PHOTOS_DIR, UNPACKED_ADVERTS_DIR } from "./fetchNewOffers";
import rmfr from "rmfr";

export const resetEveryting = async () => {
  await rmfr(UNPACKED_ADVERTS_DIR);
  await rmfr(PHOTOS_DIR);
  await dropAllOffers();
  await dropAllAddedToDbFiles();
};
