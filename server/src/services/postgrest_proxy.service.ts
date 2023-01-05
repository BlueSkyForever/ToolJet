import { Injectable, NotFoundException } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { EntityManager, In } from 'typeorm';
import { InternalTable } from 'src/entities/internal_table.entity';
import { User } from 'src/entities/user.entity';
import * as proxy from 'express-http-proxy';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { maybeSetSubPath } from '../helpers/utils.helper';

@Injectable()
export class PostgrestProxyService {
  constructor(private readonly manager: EntityManager, private readonly configService: ConfigService) {}

  async perform(user, req, res, next) {
    req.url = await this.replaceTableNamesAtPlaceholder(req, user);
    const authToken = 'Bearer ' + this.signJwtPayload(this.configService.get<string>('PG_USER'));
    req.headers['Authorization'] = authToken;
    req.headers['Prefer'] = 'count=exact'; // To get the total count of records

    res.set('Access-Control-Expose-Headers', 'Content-Range');

    console.log('Proxying request');
    console.log(this.configService.get<string>('PGRST_HOST'));
    return this.httpProxy(req, res, next);
  }

  private httpProxy = proxy(this.configService.get<string>('PGRST_HOST'), {
    preserveHostHdr: true,
    parseReqBody: false,
    proxyReqPathResolver: function (req) {
      const path = '/api/tooljet_db/organizations';
      const pathRegex = new RegExp(`${maybeSetSubPath(path)}/.{36}/proxy`);
      const parts = req.url.split('?');
      const queryString = parts[1];
      const updatedPath = parts[0].replace(pathRegex, '');

      console.log(`Proxying request path: ${updatedPath}`);
      return updatedPath + (queryString ? '?' + queryString : '');
    },
  });

  private signJwtPayload(role: string) {
    const payload = { role };
    const secretKey = this.configService.get<string>('PGRST_JWT_SECRET');
    const token = jwt.sign(payload, secretKey, {
      algorithm: 'HS256',
      expiresIn: '1m',
    });

    return token;
  }

  // The table names are wrapped inside placeholder ${}
  // Example:
  // /proxy/${actors}?select=first_name,last_name,${films}(title)
  // to
  // /proxy/table-id-1?select=first_name,last_name,table-id-2(title)
  async replaceTableNamesAtPlaceholder(req: Request, user: User) {
    const urlToReplace = decodeURIComponent(req.url);
    const placeHolders = urlToReplace.match(/\$\{.+\}/g);

    if (isEmpty(placeHolders)) return req.url;

    const requestedtableNames = placeHolders.map((placeHolder) => placeHolder.slice(2, -1));
    const internalTables = await this.findOrFailAllInternalTableFromTableNames(requestedtableNames, user);
    const internalTableNametoIdMap = requestedtableNames.reduce((acc, tableName) => {
      return {
        ...acc,
        [tableName]: internalTables.find((table) => table.tableName === tableName).id,
      };
    }, {});

    return this.replacePlaceholdersInUrlWithTableIds(internalTableNametoIdMap, requestedtableNames, urlToReplace);
  }

  private replacePlaceholdersInUrlWithTableIds(
    internalTableNametoIdMap: { [x: string]: string },
    tableNames: Array<string>,
    url: string
  ) {
    let urlBeingReplaced = url;

    tableNames.forEach(
      (tableName) =>
        (urlBeingReplaced = urlBeingReplaced.replace('${' + tableName + '}', internalTableNametoIdMap[tableName]))
    );

    return urlBeingReplaced;
  }

  private async findOrFailAllInternalTableFromTableNames(requestedTableNames: Array<string>, user: User) {
    const internalTables = await this.manager.find(InternalTable, {
      where: {
        organizationId: user.defaultOrganizationId,
        tableName: In(requestedTableNames),
      },
    });

    const obtainedTableNames = internalTables.map((t) => t.tableName);
    const tableNamesNotInOrg = requestedTableNames.filter((tableName) => !obtainedTableNames.includes(tableName));

    if (isEmpty(tableNamesNotInOrg)) return internalTables;

    throw new NotFoundException('Internal table not found: ' + tableNamesNotInOrg);
  }
}
