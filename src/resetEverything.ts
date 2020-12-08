import rmfr from "rmfr";
import { dropAllAddedToDbFiles, dropAllOffers } from "./db";
import { PHOTOS_DIR, UNPACKED_ADVERTS_DIR } from "./fetchNewOffers";

export const resetEveryting = async () => {
  try {
    await rmfr(UNPACKED_ADVERTS_DIR);
    await rmfr(PHOTOS_DIR);
  } catch (e) {}

  await dropAllOffers();
  await dropAllAddedToDbFiles();
};
