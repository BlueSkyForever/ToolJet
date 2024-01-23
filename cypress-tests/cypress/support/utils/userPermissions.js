import { commonSelectors } from "Selectors/common";
import { usersSelector } from "Selectors/manageUsers";
import { usersText } from "Texts/manageUsers";
import * as users from "Support/utils/manageUsers";
import * as common from "Support/utils/common";
import { path } from "Texts/common";
import { groupsSelector } from "Selectors/manageGroups";
import { groupsText } from "Texts/manageGroups";
import { dashboardSelector } from "Selectors/dashboard";

export const adminLogin = () => {
  common.logout();
  cy.defaultWorkspaceLogin();
  common.navigateToManageGroups();
};

export const reset = () => {
  common.navigateToManageGroups();
  cy.get(groupsSelector.permissionsLink).click();

  cy.get(groupsSelector.appsCreateCheck).then(($el) => {
    if ($el.is(":checked")) {
      cy.get(groupsSelector.appsCreateCheck).uncheck();
    }
  });

  cy.get(groupsSelector.appsDeleteCheck).then(($el) => {
    if ($el.is(":checked")) {
      cy.get(groupsSelector.appsDeleteCheck).uncheck();
    }
  });

  cy.get(groupsSelector.foldersCreateCheck).then(($el) => {
    if ($el.is(":checked")) {
      cy.get(groupsSelector.foldersCreateCheck).uncheck();
    }
  });

  cy.get(groupsSelector.workspaceVarCheckbox).then(($el) => {
    if ($el.is(":checked")) {
      cy.get(groupsSelector.workspaceVarCheckbox).uncheck();
    }
  });
};

export const addNewUser = (firstName, email, companyName) => {
  common.navigateToManageUsers();
  users.inviteUser(firstName, email);
  updateWorkspaceName(email);
};

// export const reset = (groupName) => {
//   cy.intercept("GET", "http://localhost:3000/api/group_permissions").as(`${groupName}`);
//   cy.wait(2000)

//   common.navigateToManageGroups();
//   cy.wait(2000)
//   cy.get('[data-cy="all-users-list-item"] > span > div').click()

//   cy.wait(`@${groupName}`).then((groupResponse) => {
//     const groupId = groupResponse.response.body.group_permissions.find(
//       (group) => group.group === groupName
//     ).id;

//     cy.task("updateId", {
//       dbconfig: Cypress.env("app_db"),
//       sql: `
//         UPDATE group_permissions
//         SET app_create = false,
//             app_delete = false,
//             folder_create = false,
//             org_environment_variable_create = false,
//             org_environment_variable_update = false,
//             org_environment_variable_delete = false,
//             org_environment_constant_create = false,
//             org_environment_constant_delete = false,
//             folder_delete = false,
//             folder_update = false
//         WHERE id = ${groupId};
//       `,
//     });
//   });
// };

export const updateWorkspaceName = (email) => {
  let workspaceNametimeStamp, workspaceId, userId, defuserId, defWorkspaceId;

  cy.task("updateId", {
    dbconfig: Cypress.env("app_db"),
    sql: `select id from users where email='${email}';`,
  }).then((resp) => {
    userId = resp.rows[0].id;

    cy.task("updateId", {
      dbconfig: Cypress.env("app_db"),
      sql: "select id from users where email='dev@tooljet.io';",
    }).then((resp) => {
      defuserId = resp.rows[0].id;

      cy.task("updateId", {
        dbconfig: Cypress.env("app_db"),
        sql: `SELECT organization_id FROM organization_users WHERE user_id = '${defuserId}' `,
      }).then((resp) => {
        defWorkspaceId = resp.rows[0].organization_id;
        cy.task("updateId", {
          dbconfig: Cypress.env("app_db"),
          sql: `SELECT organization_id FROM organization_users WHERE user_id = '${userId}'AND organization_id <> '${defWorkspaceId}';`,
        }).then((resp) => {
          workspaceId = resp.rows[0].organization_id;

          cy.task("updateId", {
            dbconfig: Cypress.env("app_db"),
            sql: `select name from organizations where id='${workspaceId}';`,
          }).then((resp) => {
            workspaceNametimeStamp = resp.rows[0].name;
            cy.get(commonSelectors.workspaceName).click();
            cy.contains(`${workspaceNametimeStamp}`).should("exist");

            cy.task("updateId", {
              dbconfig: Cypress.env("app_db"),
              sql: `update organizations set name ='${email}' where name='${workspaceNametimeStamp}';`,
            });
          });
        });
      });
    });
  });
};
