const urrl = require('url');
import { readFileSync } from 'fs';
import * as tls from 'tls';
import { QueryError, QueryResult, QueryService, cleanSensitiveData, User, App } from '@tooljet-plugins/common';
const JSON5 = require('json5');
import got, { Headers, HTTPError, OptionsOfTextResponseBody } from 'got';

function isEmpty(value: number | null | undefined | string) {
  return (
    value === undefined ||
    value === null ||
    !isNaN(value as number) ||
    (typeof value === 'object' && Object.keys(value).length === 0) ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

function sanitizeCustomParams(customArray: any) {
  const params = Object.fromEntries(customArray ?? []);
  Object.keys(params).forEach((key) => (params[key] === '' ? delete params[key] : {}));
  return params;
}

interface RestAPIResult extends QueryResult {
  request?: Array<object> | object;
  response?: Array<object> | object;
  responseHeaders?: Array<object> | object;
}

export default class RestapiQueryService implements QueryService {
  /* Headers of the source will be overridden by headers of the query */
  headers(sourceOptions: any, queryOptions: any, hasDataSource: boolean): Headers {
    const _headers = (queryOptions.headers || []).filter((o) => {
      return o.some((e) => !isEmpty(e));
    });

    if (!hasDataSource) return Object.fromEntries(_headers);

    const headerData = _headers.concat(sourceOptions.headers || []);

    const headers = Object.fromEntries(headerData);
    Object.keys(headers).forEach((key) => (headers[key] === '' ? delete headers[key] : {}));

    return headers;
  }

  /* Body params of the source will be overridden by body params of the query */
  body(sourceOptions: any, queryOptions: any, hasDataSource: boolean): object {
    const bodyToggle = queryOptions['body_toggle'];
    if (bodyToggle) {
      const jsonBody = queryOptions['json_body'];
      if (!jsonBody) return undefined;
      if (typeof jsonBody === 'string') return JSON5.parse(jsonBody);
      else return jsonBody;
    } else {
      const _body = (queryOptions.body || []).filter((o) => {
        return o.some((e) => !isEmpty(e));
      });

      if (!hasDataSource) return Object.fromEntries(_body);

      const bodyParams = _body.concat(sourceOptions.body || []);
      return Object.fromEntries(bodyParams);
    }
  }

  /* Search params of the source will be overridden by Search params of the query */
  searchParams(sourceOptions: any, queryOptions: any, hasDataSource: boolean): object {
    const _urlParams = (queryOptions.url_params || []).filter((o) => {
      return o.some((e) => !isEmpty(e));
    });

    if (!hasDataSource) return Object.fromEntries(_urlParams);

    const urlParams = _urlParams.concat(sourceOptions.url_params || []);
    return Object.fromEntries(urlParams);
  }

  isJson(str: string) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  private getCurrentToken = (isMultiAuthEnabled: boolean, tokenData: any, userId: string, isAppPublic: boolean) => {
    if (isMultiAuthEnabled) {
      if (!tokenData || !Array.isArray(tokenData)) return null;
      return !isAppPublic ? tokenData.find((token: any) => token.user_id === userId) : tokenData[0];
    } else {
      return tokenData;
    }
  };

  async run(
    sourceOptions: any,
    queryOptions: any,
    dataSourceId: string,
    dataSourceUpdatedAt: string,
    context?: { user?: User; app?: App }
  ): Promise<RestAPIResult> {
    /* REST API queries can be adhoc or associated with a REST API datasource */
    const hasDataSource = dataSourceId !== undefined;
    const authType = sourceOptions['auth_type'];
    const requiresOauth = authType === 'oauth2';

    const headers = this.headers(sourceOptions, queryOptions, hasDataSource);
    const customQueryParams = sanitizeCustomParams(sourceOptions['custom_query_params']);
    const isUrlEncoded = this.checkIfContentTypeIsURLenc(queryOptions['headers']);
    const isMultiAuthEnabled = sourceOptions['multiple_auth_enabled'];

    /* Chceck if OAuth tokens exists for the source if query requires OAuth */
    if (requiresOauth) {
      const tokenData = sourceOptions['token_data'];
      const isAppPublic = context?.app.isPublic;
      const currentToken = this.getCurrentToken(isMultiAuthEnabled, tokenData, context?.user.id, isAppPublic);

      if (!currentToken && isAppPublic) {
        throw new QueryError('Missing access token', {}, {});
      }

      if (!currentToken) {
        const tooljetHost = process.env.TOOLJET_HOST;
        const authUrl = new URL(
          `${sourceOptions['auth_url']}?response_type=code&client_id=${sourceOptions['client_id']}&redirect_uri=${tooljetHost}/oauth2/authorize&scope=${sourceOptions['scopes']}`
        );
        Object.entries(customQueryParams).map(([key, value]) => authUrl.searchParams.append(key, value));

        return {
          status: 'needs_oauth',
          data: { auth_url: authUrl },
        };
      } else {
        const accessToken = currentToken['access_token'];
        if (sourceOptions['add_token_to'] === 'header') {
          const headerPrefix = sourceOptions['header_prefix'];
          headers['Authorization'] = `${headerPrefix}${accessToken}`;
        }
      }
    }

    let result = {};
    let requestObject = {};
    let responseObject = {};
    let responseHeaders = {};

    /* Prefixing the base url of datasouce if datasource exists */
    const url = hasDataSource ? `${sourceOptions.url}${queryOptions.url || ''}` : queryOptions.url;

    const method = queryOptions['method'];
    const json = method !== 'get' ? this.body(sourceOptions, queryOptions, hasDataSource) : undefined;
    const paramsFromUrl = urrl.parse(url, true).query;

    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${sourceOptions.bearer_token}`;
    }

    const requestOptions: OptionsOfTextResponseBody = {
      method,
      headers,
      ...this.fetchHttpsCertsForCustomCA(),
      searchParams: {
        ...paramsFromUrl,
        ...this.searchParams(sourceOptions, queryOptions, hasDataSource),
      },
      ...(isUrlEncoded ? { form: json } : { json }),
    };

    if (authType === 'basic') {
      requestOptions.username = sourceOptions.username;
      requestOptions.password = sourceOptions.password;
    }

    try {
      const response = await got(url, requestOptions);
      result = this.isJson(response.body) ? JSON.parse(response.body) : response.body;
      requestObject = {
        requestUrl: response.request.requestUrl,
        method: response.request.options.method,
        headers: response.request.options.headers,
        params: urrl.parse(response.request.requestUrl, true).query,
      };

      responseObject = {
        body: response.body,
        statusCode: response.statusCode,
      };

      responseHeaders = response.headers;
    } catch (error) {
      console.log(error);

      if (error instanceof HTTPError) {
        result = {
          requestObject: {
            requestUrl: error.request.requestUrl,
            requestHeaders: error.request.options.headers,
            requestParams: urrl.parse(error.request.requestUrl, true).query,
          },
          responseObject: {
            statusCode: error.response.statusCode,
            responseBody: error.response.body,
          },
          responseHeaders: error.response.headers,
        };
      }
      throw new QueryError('Query could not be completed', error.message, result);
    }

    requestObject['headers'] = cleanSensitiveData(requestObject['headers'], ['authorization']);

    return {
      status: 'ok',
      data: result,
      request: requestObject,
      response: responseObject,
      responseHeaders,
    };
  }

  fetchHttpsCertsForCustomCA() {
    if (!process.env.NODE_EXTRA_CA_CERTS) return {};

    return {
      https: {
        certificateAuthority: [...tls.rootCertificates, readFileSync(process.env.NODE_EXTRA_CA_CERTS)].join('\n'),
      },
    };
  }

  checkIfContentTypeIsURLenc(headers: [] = []) {
    const objectHeaders = Object.fromEntries(headers);
    const contentType = objectHeaders['content-type'] ?? objectHeaders['Content-Type'];
    return contentType === 'application/x-www-form-urlencoded';
  }

  async refreshToken(sourceOptions: any, error: any, userId: string, isAppPublic: boolean) {
    const isMultiAuthEnabled = sourceOptions['multiple_auth_enabled'];
    const currentToken = this.getCurrentToken(isMultiAuthEnabled, sourceOptions['token_data'], userId, isAppPublic);
    const refreshToken = currentToken['refresh_token'];
    if (!refreshToken) {
      throw new QueryError('Refresh token not found', error.response, {});
    }
    const accessTokenUrl = sourceOptions['access_token_url'];
    const clientId = sourceOptions['client_id'];
    const clientSecret = sourceOptions['client_secret'];
    const grantType = 'refresh_token';
    const isUrlEncoded = this.checkIfContentTypeIsURLenc(sourceOptions['access_token_custom_headers']);
    const customAccessTokenHeaders = sanitizeCustomParams(sourceOptions['access_token_custom_headers']);

    const data = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: grantType,
      refresh_token: refreshToken,
    };

    const accessTokenDetails = {};

    try {
      const response = await got(accessTokenUrl, {
        method: 'post',
        headers: {
          'Content-Type': isUrlEncoded ? 'application/x-www-form-urlencoded' : 'application/json',
          ...customAccessTokenHeaders,
        },
        form: isUrlEncoded ? data : undefined,
        json: !isUrlEncoded ? data : undefined,
      });
      const result = JSON.parse(response.body);

      if (!(response.statusCode >= 200 || response.statusCode < 300)) {
        throw new QueryError('could not connect to Oauth server', error.response, {});
      }

      if (result['access_token']) {
        accessTokenDetails['access_token'] = result['access_token'];
        accessTokenDetails['refresh_token'] = refreshToken;
      }
    } catch (error) {
      console.log(error.response.body);
      throw new QueryError('could not connect to Oauth server', error.response, {});
    }
    return accessTokenDetails;
  }
}
