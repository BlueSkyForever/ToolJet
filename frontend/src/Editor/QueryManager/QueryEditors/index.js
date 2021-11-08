import React from 'react';

import DynamicForm from '@/_components/DynamicForm';

import { Restapi } from './Restapi';
// import { Mysql } from './Mysql';
// import { Postgresql } from './Postgresql';
import { Stripe } from './Stripe';
// import { Firestore } from './Firestore';
// import { Redis } from './Redis';
// import { Googlesheets } from './Googlesheets';
// import { Elasticsearch } from './Elasticsearch';
// import { Slack } from './Slack';
// import { Mongodb } from './Mongodb';
// import { Dynamodb } from './Dynamodb';
// import { Airtable } from './Airtable';
// import { Graphql } from './Graphql';
// import { Mssql } from './Mssql';
// import { S3 } from './S3';

import MysqlSchema from './Mysql.schema.json';
import MssqlSchema from './Mssql.schema.json';
import GraphqlSchema from './Graphql.schema.json';
import RedisSchema from './Redis.schema.json';
import AirtableSchema from './Airtable.schema.json';
import DynamodbSchema from './Dynamodb.schema.json';
import FirestoreSchema from './Firestore.schema.json';
import ElasticsearchSchema from './Elasticsearch.schema.json';
import MongodbSchema from './Mongodb.schema.json';
import PostgresqlSchema from './Postgresql.schema.json';
import SlackSchema from './Slack.schema.json';
import S3Schema from './S3.schema.json';
import GooglesheetsSchema from './Googlesheets.schema.json';

const Mysql = ({ ...rest }) => <DynamicForm schema={MysqlSchema} {...rest} />;
const Mssql = ({ ...rest }) => <DynamicForm schema={MssqlSchema} {...rest} />;
const Graphql = ({ ...rest }) => <DynamicForm schema={GraphqlSchema} {...rest} />;
const Redis = ({ ...rest }) => <DynamicForm schema={RedisSchema} {...rest} />;
const Airtable = ({ ...rest }) => <DynamicForm schema={AirtableSchema} {...rest} />;
const Dynamodb = ({ ...rest }) => <DynamicForm schema={DynamodbSchema} {...rest} />;
const Firestore = ({ ...rest }) => <DynamicForm schema={FirestoreSchema} {...rest} />;
const Elasticsearch = ({ ...rest }) => <DynamicForm schema={ElasticsearchSchema} {...rest} />;
const Mongodb = ({ ...rest }) => <DynamicForm schema={MongodbSchema} {...rest} />;
const Postgresql = ({ ...rest }) => <DynamicForm schema={PostgresqlSchema} {...rest} />;
const Slack = ({ ...rest }) => <DynamicForm schema={SlackSchema} {...rest} />;
const S3 = ({ ...rest }) => <DynamicForm schema={S3Schema} {...rest} />;
const Googlesheets = ({ ...rest }) => <DynamicForm schema={GooglesheetsSchema} {...rest} />;

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
