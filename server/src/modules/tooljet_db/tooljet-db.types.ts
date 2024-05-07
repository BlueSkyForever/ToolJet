import { QueryFailedError } from 'typeorm';
import { InternalTable } from 'src/entities/internal_table.entity';
import { capitalize } from 'lodash';

enum PostgresErrorCode {
  UniqueViolation = '23505',
  CheckViolation = '23514',
  NotNullViolation = '23502',
  ForeignKeyViolation = '23503',
  DuplicateColumn = '42701',
  UndefinedTable = '42P01',
}

export type TooljetDbActions =
  | 'add_column'
  | 'create_foreign_key'
  | 'create_table'
  | 'delete_foreign_key'
  | 'drop_column'
  | 'drop_table'
  | 'edit_column'
  | 'edit_table'
  | 'join_tables'
  | 'update_foreign_key'
  | 'view_table'
  | 'view_tables'
  | 'proxy_postgrest';

interface ErrorCodeMapping {
  [PostgresErrorCode.NotNullViolation]: Partial<Record<TooljetDbActions | 'default', string>>;
  [PostgresErrorCode.UniqueViolation]: Partial<Record<TooljetDbActions | 'default', string>>;
  [PostgresErrorCode.UndefinedTable]: Partial<Record<TooljetDbActions | 'default', string>>;
}

const errorCodeMapping: ErrorCodeMapping = {
  [PostgresErrorCode.NotNullViolation]: {
    edit_column: 'Cannot add NOT NULL constraint as this column contains NULL values',
    proxy_postgrest: 'Not null constraint violated for "{{table}}"."{{column}}"',
    default: 'Cannot add NOT NULL constraint',
  },
  [PostgresErrorCode.UniqueViolation]: {
    edit_table: 'Cannot add UNIQUE constraint as column contains duplicate values',
    edit_column: 'Cannot add UNIQUE constraint as this column contains duplicate values',
    proxy_postgrest: 'Unique constraint violated as {{value}} already exists in "{{table}}"."{{column}}"',
    default: 'Cannot add UNIQUE Key constraint',
  },
  [PostgresErrorCode.UndefinedTable]: {
    default: 'Could not find the table "{{table}}".',
  },
};

export class PostgrestError extends Error {
  code: string;
  details: string;
  hint: string;
  message: string;

  constructor(postgrestErrorResponse: { code: string; details: string; hint: string; message: string }) {
    super();

    const { code, details, hint, message } = postgrestErrorResponse;
    this.code = code;
    this.details = details;
    this.hint = hint;
    this.message = message;
  }

  toString(): string {
    return `PostgrestError [${this.code}]: ${this.message}`;
  }
}

export class TooljetDatabaseError extends QueryFailedError {
  public readonly code: string;
  public readonly context: {
    origin: TooljetDbActions;
    internalTables: (InternalTable | { id: string; tableName: string })[];
  };
  public readonly queryError: QueryFailedError;

  constructor(
    message: string,
    context: { origin: TooljetDbActions; internalTables: InternalTable[] | { id: string; tableName: string }[] },
    errorObj: QueryFailedError
  ) {
    super(message, errorObj.parameters, errorObj.driverError);
    this.context = context;
    this.code = errorObj.driverError.code;
    this.queryError = errorObj;
  }

  toString(): string {
    const errorMessage =
      errorCodeMapping[this.code]?.[this.context.origin] ||
      errorCodeMapping[this.code]?.['default'] ||
      capitalize(this.message);
    return this.replaceErrorPlaceholders(errorMessage);
  }

  replaceErrorPlaceholders(errorMessage: string): string {
    let modifiedErrorMessage = errorMessage;
    const internalTableEntries = this.context.internalTables.map(({ id, tableName }) => [id, tableName]);

    const replaceTemplateStrings = (errorMessage: string, replacements: Record<string, string>): string => {
      return Object.entries(replacements).reduce((message, [key, value]) => {
        return message.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }, errorMessage);
    };

    const replaceTableUUIDs = (errorMessage: string, internalTableEntries: string[][]): string => {
      return internalTableEntries.reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(key, 'g'), value);
      }, errorMessage);
    };

    if (this.queryError.driverError instanceof PostgrestError) {
      const parser = this.postgrestDetailsParser();
      modifiedErrorMessage = replaceTemplateStrings(modifiedErrorMessage, parser);
    }

    // TODO: Need to handle errors wherein multiple tables are involved
    if (this.context.internalTables.length === 1) {
      const replacements = { table: this.context.internalTables[0].tableName };
      modifiedErrorMessage = replaceTemplateStrings(modifiedErrorMessage, replacements);
    }

    modifiedErrorMessage = replaceTableUUIDs(modifiedErrorMessage, internalTableEntries);
    return modifiedErrorMessage;
  }

  postgrestDetailsParser(): Record<string, string> {
    const parsers = {
      [PostgresErrorCode.NotNullViolation]: () => {
        const errorMessage = this.queryError.driverError.message;
        const regex = /null value in column "(.*?)" of relation "(.*?)" violates not-null constraint/;
        const matches = regex.exec(errorMessage);
        const table = this.context.internalTables[0].tableName;
        return { table, column: matches[1], value: matches[2] };
      },
      [PostgresErrorCode.UniqueViolation]: () => {
        const errorMessage = this.queryError.driverError.details;
        const regex = /Key \((.*?)\)=\((.*?)\) already exists\./;
        const matches = regex.exec(errorMessage);
        const table = this.context.internalTables[0].tableName;
        return { table, column: matches[1], value: matches[2] };
      },
    };
    return parsers[this.code]?.();
  }
}
