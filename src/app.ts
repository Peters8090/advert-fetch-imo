import extract from "extract-zip";
import fs from "promise-fs";
import lodash from "lodash";

(async () => {
  const UNPACKED_ADVERTS_DIR = "adverts_unpacked";
  const PACKED_ADVERTS_DIR = "adverts_packed";

  let filesToUnpack: string[] = [];
  try {
    filesToUnpack = lodash.difference(
      await fs.readdir(PACKED_ADVERTS_DIR),
      await fs.readdir(UNPACKED_ADVERTS_DIR)
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const packedFile of filesToUnpack) {
    await extract(`${process.cwd()}/${PACKED_ADVERTS_DIR}/${packedFile}`, {
      dir: `${process.cwd()}/${UNPACKED_ADVERTS_DIR}/${packedFile}`,
    });
  }
})();
