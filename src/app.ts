import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { scheduleJob } from "node-schedule";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { dbInit, getAllOffers } from "./db";
import { fetchNewOffers } from "./fetchNewOffers";
import { extractFilters } from "./filters";
import { propertiesMappings } from "./propertiesMappings";
import { resetEveryting } from "./resetEverything";
import { getImportantData } from "./utility";

export const IMPORTANT_DATA_FILE_PATH = "importantData.json";

(async () => {
  await dbInit();

  const importantData = await getImportantData();

  if (importantData.isTest) {
    await resetEveryting();
  }

  const cronCallback = async () => {
    await fetchNewOffers();
    console.log(`Fetched new offers - ${new Date().toString()}`);
  };

  await cronCallback();

  scheduleJob(importantData.cronSchedule, cronCallback);
  const app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cors());
  app.use(mongoSanitize());
  app.use(require("content-filter")());
  app.use(express.static("public"));

  app.get("/", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const filters = extractFilters(req.query);

    const resp = {
      ...((await getAllOffers(filters)) as {
        docs: any[];
      }),
    };

    const newDocs: any[] = new Array(resp.docs.length)
      .fill(null)
      .map(() =>
        Object.fromEntries(
          Object.entries(propertiesMappings).map(([key]) => [key, {}])
        )
      );

    resp.docs.forEach((offer, i) =>
      Object.entries(offer).forEach(([propertyName, propertyValue]) => {
        Object.entries(propertiesMappings).forEach(
          ([mappingGroup, mappingProperties]) => {
            if (mappingProperties[propertyName]) {
              newDocs[i][mappingGroup][
                mappingProperties[propertyName]
              ] = propertyValue;
            }
          }
        );
      })
    );

    resp.docs = newDocs;

    res.writeHead(200);

    res.end(JSON.stringify(resp));
  });

  app.get("/which-page", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const slug = req.query.slug;
    if (!slug) {
      res.writeHead(400);
      return res.end();
    }

    const filters = extractFilters(req.query);

    let maxPages = 1;
    for (let page = 1; page <= maxPages; page++) {
      const resp = {
        ...((await getAllOffers({ ...filters, page: page })) as {
          totalPages: number;
          docs: any[];
        }),
      };

      maxPages = resp.totalPages;

      if (resp.docs.find((o) => o.slug === slug)) {
        res.writeHead(200);
        return res.end(
          JSON.stringify({
            page: page,
          })
        );
      }
    }
    res.writeHead(404);
    return res.end();
  });

  app.post("/contact-form", (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const smtpTrans = nodemailer.createTransport({
      host: importantData.mailConfig.smtpConfig.host,
      port: importantData.mailConfig.smtpConfig.port,
      secure: importantData.mailConfig.smtpConfig.secure,
      auth: {
        user: importantData.mailConfig.smtpConfig.user,
        pass: importantData.mailConfig.smtpConfig.password,
      },
    });

    const text = req.body.text;
    const sender = req.body.sender;
    const email = req.body.email;
    const phoneNumber = req.body.phoneNumber;

    if (
      !text ||
      !sender ||
      !email ||
      !phoneNumber ||
      !email.includes("@") ||
      !phoneNumber.split("").find((s: any) => !isNaN(+s))
    ) {
      res.writeHead(400);
      return res.end();
    }

    const mailOpts: Mail.Options = {
      to: importantData.mailConfig.toEmail,
      subject: `Nowa wiadomość z formularza kontaktowego na ${importantData.frontendAddress} od ${sender}`,
      text: `Email: ${email}. Telefon: ${phoneNumber}.\n\n${text}`,
    };

    smtpTrans.sendMail(mailOpts, (error) => {
      if (error) {
        console.log(error);

        res.writeHead(500);
        return res.end();
      } else {
        res.writeHead(200);
        return res.end();
      }
    });
  });

  app.listen(importantData.port);

  console.log("Server is ready");
})();
