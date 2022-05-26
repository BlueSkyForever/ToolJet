/* eslint-disable @typescript-eslint/no-unused-vars */
import { QueryError, QueryResult, QueryService, ConnectionTestResult } from '@tooljet-plugins/common';
import { SourceOptions, QueryOptions } from './types';

export default class Cloudrunapi implements QueryService {
  async run(sourceOptions: SourceOptions, queryOptions: QueryOptions, dataSourceId: string): Promise<QueryResult> {
    return {
      status: 'ok',
      data: {},
    };
  }
}
