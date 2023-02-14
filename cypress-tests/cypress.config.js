const { defineConfig } = require("cypress");
const  {readPdf}= require ("./cypress/scripts/tasks");
const { rmdir} = require("fs");
const fs = require("fs");
const XLSX = require("node-xlsx");

const pg = require("pg");
const path = require('path')
const pdf = require('pdf-parse');


module.exports = defineConfig({
  execTimeout: 1800000,
  defaultCommandTimeout: 30000,
  requestTimeout: 10000,
  pageLoadTimeout: 20000,
  responseTimeout: 10000,
  viewportWidth: 1200,
  viewportHeight: 960,
  chromeWebSecurity: false,
  trashAssetsBeforeRuns: true,

  e2e: {
    setupNodeEvents(on, config) {
      on("task", {
        readPdf(pathToPdf){
          return new Promise((resolve) => {
            const pdfPath = path.resolve(pathToPdf)
            let dataBuffer = fs.readFileSync(pdfPath);
            pdf(dataBuffer).then(function ({ text }) {
              resolve(text)
            });
          })
        }
      });

      on("task", {
        readXlsx( filePath ) {
          return new Promise((resolve, reject) => {
            try {
            let dataBuffer = fs.readFileSync(filePath);
              const jsonData = XLSX.parse(dataBuffer);
              // jsonData= jsonData[0].data
              resolve(jsonData[0]["data"].toString());
            } catch (e) {
              reject(e);
            }
          });
        }
      });

      on("task", { deleteFolder(folderName) {
        return new Promise((resolve, reject) => {
          rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
            if (err) {
              console.error(err);
              return reject(err);
            }
            resolve(null);
          });
        });
      }
      });

    on("task", { updateId({ dbconfig, sql }){
        const client = new pg.Pool(dbconfig);
        return client.query(sql);
      }
    });
      return require("./cypress/plugins/index.js")(on, config);
    },
    experimentalRunAllSpecs: true,
    experimentalModfyObstructiveThirdPartyCode: true,
    experimentalRunAllSpecs: true,
    baseUrl: "http://localhost:8082",
    specPattern: "cypress/e2e/**/*.cy.js",
    numTestsKeptInMemory: 0,
    redirectionLimit: 10,
    experimentalRunAllSpecs: true,
<<<<<<< HEAD
    downloadsFolder: "cypress/downloads",
    trashAssetsBeforeRuns: true,
=======
    experimentalMemoryManagement: true,
>>>>>>> origin/develop
  },
});
