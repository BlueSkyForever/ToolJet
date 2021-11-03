import React from 'react';

import DynamicForm from '@/_components/DynamicForm';

import { Restapi } from './Restapi';
import { Mysql } from './Mysql';
import { Postgresql } from './Postgresql';
import { Stripe } from './Stripe';
import { Firestore } from './Firestore';
import { Redis } from './Redis';
import { Googlesheets } from './Googlesheets';
import { Elasticsearch } from './Elasticsearch';
import { Slack } from './Slack';
import { Mongodb } from './Mongodb';
import { Dynamodb } from './Dynamodb';
import { Airtable } from './Airtable';
import { Graphql } from './Graphql';
// import { Mssql } from './Mssql';
import { S3 } from './S3';

import MssqlSchema from './Mssql.schema.json';
const Mssql = ({ ...rest }) => <DynamicForm schema={MssqlSchema} {...rest} />;

export const allSources = {
  Restapi,
  Mysql,
  Postgresql,
  Stripe,
  Firestore,
  Redis,
  Googlesheets,
  Elasticsearch,
  Slack,
  Mongodb,
  Dynamodb,
  Airtable,
  Graphql,
  Mssql,
  S3,
};
