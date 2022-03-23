import { BehaviorSubject } from 'rxjs';
import { history, handleResponse } from '@/_helpers';
import config from 'config';

const currentUserSubject = new BehaviorSubject(JSON.parse(localStorage.getItem('currentUser')));

export const authenticationService = {
  login,
  getOrganizationConfigs,
  logout,
  signup,
  updateCurrentUserDetails,
  currentUser: currentUserSubject.asObservable(),
  get currentUserValue() {
    return currentUserSubject.value;
  },
  signInViaOAuth,
};

function login(email, password, organizationId) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  };

  return fetch(`${config.apiUrl}/authenticate${organizationId ? `/${organizationId}` : ''}`, requestOptions)
    .then(handleResponse)
    .then((user) => {
      // store user details and jwt token in local storage to keep user logged in between page refreshes
      updateUser(user);
      return user;
    });
}

function getOrganizationConfigs(organizationId) {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  };

  return fetch(
    `${config.apiUrl}/organizations/${organizationId ? `${organizationId}/` : ''}public-configs`,
    requestOptions
  )
    .then(handleResponse)
    .then((configs) => configs?.sso_configs);
}

function updateCurrentUserDetails(details) {
  const currentUserDetails = JSON.parse(localStorage.getItem('currentUser'));
  const updatedUserDetails = Object.assign({}, currentUserDetails, details);
  updateUser(updatedUserDetails);
}

function signup(email) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  };

  return fetch(`${config.apiUrl}/signup`, requestOptions)
    .then(handleResponse)
    .then((user) => {
      return user;
    });
}

function logout() {
  // remove user from local storage to log user out
  localStorage.removeItem('currentUser');
  currentUserSubject.next(null);
  history.push(`/login?redirectTo=${window.location.pathname?.startsWith('/sso/') ? '/' : 'props.location.pathname'}`);
}

function signInViaOAuth(configId, ssoResponse) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ssoResponse),
  };

  return fetch(`${config.apiUrl}/oauth/sign-in/${configId}`, requestOptions)
    .then(handleResponse)
    .then((user) => {
      updateUser(user);
      return user;
    });
}
function updateUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
  currentUserSubject.next(user);
}
