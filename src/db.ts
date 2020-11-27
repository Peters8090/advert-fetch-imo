import { important_data } from "./important_data";
import mongoose from "mongoose";

const offersSchema = new mongoose.Schema({}, { strict: false });
const Offers = mongoose.model("offers", offersSchema);

const addedToDbFilesSchema = new mongoose.Schema({ fileName: String });
const AddedToDbFiles = mongoose.model("addedToDbFiles", addedToDbFilesSchema);

export const dbInit = () => {
  return mongoose.connect(important_data.dbUri, { useNewUrlParser: true });
};

export const addAddedToDbFile = (fileName: string) => {
  return new AddedToDbFiles({
    fileName,
  }).save();
};

export const getAllAddedToDbFiles = () => {
  return new Promise((resolve) => {
    AddedToDbFiles.find((_, res) => {
      resolve(res);
    });
  });
};

export const addOffer = (properties: object) => {
  return new Offers(properties).save();
};

export const removeOffer = (imoId: string) => {
  return Offers.deleteMany(
    {
      imoId,
    },
    () => {}
  );
};

export const updateOffer = async (imoId: string, properties: object) => {
  await removeOffer(imoId);
  await addOffer(properties);
};

export const findOffer = (imoId: string) => {
  return Offers.findOne(
    {
      imoId,
    },
    () => {}
  );
};

export const dropAllOffers = () => {
  return Offers.deleteMany({}, () => {});
};

export const dropAllAddedToDbFiles = () => {
  return AddedToDbFiles.deleteMany({}, () => {});
};

export const getAllOffers = (conditions?: Record<string, any>) => {
  return new Promise((resolve) => {
    if (conditions) {
      Offers.find(conditions, (_, res) => {
        resolve(res);
      });
    } else {
      Offers.find((_, res) => {
        resolve(res);
      });
    }
  });
};
