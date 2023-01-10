const { defineConfig } = require("cypress");
const { rmdir } = require("fs");
const pg = require("pg");

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
  env: {
    pg_host: "",
    pg_user: "",
    pg_password: "",
    elasticsearch_host:
      "search-tooljet-es-test-q7w5m4iml5xuvvzwl4reg3vkum.us-west-1.es.amazonaws.com",
    elasticsearch_user: "elasticsearch",
    elasticsearch_password: "ToolJet123!",
    sso_password: "",
    git_user: "",
    google_user: "",
    dynamodb_access_key: "AKIATFA53SDS6HCQ5YLT",
    dynamodb_secret_key: "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",
    smtp_host: "smtp-relay.sendinblue.com",
    smtp_port: "587",
    smtp_user: "midhun@tooljet.com",
    smtp_password: "TnZ4cBCrYs6fNKk2",
  },
  db: {
    user: "postgres",
    host: "localhost",
    database: "tooljet_development",
    password: "postgres",
    port: "5432",
  },
  e2e: {
    setupNodeEvents(on, config) {
      on("task", {
        deleteFolder(folderName) {
          return new Promise((resolve, reject) => {
            rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
              if (err) {
                console.error(err);
                return reject(err);
              }
              resolve(null);
            });
          });
        },
      });

      on("task", {
        UpdateId({ dbconfig, sql }) {
          const client = new pg.Pool(dbconfig);
          return client.query(sql);
        },
      });

      return require("./cypress/plugins/index.js")(on, config);
    },
    experimentalModfyObstructiveThirdPartyCode: true,
    baseUrl: "http://localhost:8082",
    specPattern: "cypress/e2e/**/*.cy.js",
  },
});
