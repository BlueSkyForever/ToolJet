export const ssoSelector = {
  pagetitle: "[data-cy=manage-sso-page-title]",
  generalSettingsElements: {
    generalSettings: "[data-cy=left-menu-items] :eq(0)",
    enableSignupLabel: '[data-cy="enable-sign-up-label"]',
    helperText: "[data-cy=enable-sign-up-helper-text]",
    allowDefaultSSOLabel: '[data-cy="allow-default-sso-label"]',
    allowDefaultSSOHelperText: '[data-cy="allow-default-sso-helper-text"]',
    allowedDomainLabel: "[data-cy=allowed-domains-label]",
    allowedDomainHelperText: '[data-cy="allowed-domain-helper-text"]',
    workspaceLoginUrl: '[data-cy="workspace-login-url-label"]',
    workspaceLoginHelpText: '[data-cy="workspace-login-help-text"]',
  },
  cardTitle: "[data-cy=card-title]",
  enableSignUpToggle: '[data-cy="enable-sign-up-toggle"]',
  allowDefaultSSOToggle: '[data-cy="allow-default-sso-toggle"]',
  defaultSSOImage: '[data-cy="default-sso-status-image"]',
  allowedDomainInput: "[data-cy=allowed-domain-input]",
  workspaceLoginUrl: '[data-cy="workspace-login-url"]',
  cancelButton: "[data-cy=cancel-button]",
  saveButton: "[data-cy=save-button]",
  google: "[data-cy=left-menu-items] :eq(1)",
  googleEnableToggle: '[data-cy="google-enable-toggle"]',
  statusLabel: "[data-cy=status-label]",
  clientIdLabel: "[data-cy=client-id-label]",
  clientIdInput: "[data-cy=client-id-input]",
  redirectUrlLabel: "[data-cy=redirect-url-label]",
  redirectUrl: "[data-cy=redirect-url]",
  googleTile: '[data-cy="google-sign-in-text"]',
  googleIcon: "[data-cy=google-icon]",
  googleSignInText: "[data-cy=google-sign-in-text]",
  git: "[data-cy=left-menu-items] :eq(2)",
  gitEnableToggle: '[data-cy="git-enable-toogle"]',
  clientSecretLabel: "[data-cy=client-secret-label]",
  encriptedLabel: "[data-cy=encripted-label]",
  clientSecretInput: "[data-cy=client-secret-input]",
  gitTile: "[data-cy=git-tile]",
  gitIcon: "[data-cy=git-icon]",
  gitSignInText: "[data-cy=git-sign-in-text]",
  password: "[data-cy=left-menu-items] :eq(3)",
  passwordEnableToggle: '[data-cy="password-enable-toggle"]',
  loginHelpText: "[data-cy=login-help-text]",
  allowedDomainHelpText: "[data-cy=allowed-domain-help-text]",
  hostNameLabel: '[data-cy="host-name-label"]',
  hostNameInput: '[data-cy="host-name-input"]',
  hostNameHelpText: '[data-cy="git-sso-help-text"]',
  signInHeader: '[data-cy="sign-in-header"]',
  workspaceSubHeader: '[data-cy="workspace-sign-in-sub-header"]',
  noLoginMethodWarning: '[data-cy="no-login-methods-warning"]',
};