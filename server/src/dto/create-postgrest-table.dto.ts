import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  ArrayMinSize,
  IsArray,
  IsOptional,
  Matches,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

import { sanitizeInput } from 'src/helpers/utils.helper';

@ValidatorConstraint({ name: 'reservedkeyword', async: false })
class ReservedKeywordConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    return !/^(ABORT|ABS|ABSOLUTE|ACCESS|ACTION|ADA|ADD|ADMIN|AFTER|AGGREGATE|ALL|ALLOCATE|ALTER|ANALYSE|ANALYZE|AND|ANY|ARE|ARRAY|AS|ASC|ASENSITIVE|ASSERTION|ASSIGNMENT|ASYMMETRIC|AT|ATOMIC|ATTRIBUTE|ATTRIBUTES|AUTHORIZATION|AVG|BACKWARD|BEFORE|BEGIN|BERNOULLI|BETWEEN|BIGINT|BINARY|BIT|BITVAR|BIT_LENGTH|BLOB|BOOLEAN|BOTH|BREADTH|BY|C|CACHE|CALL|CALLED|CARDINALITY|CASCADE|CASCADED|CASE|CAST|CATALOG|CATALOG_NAME|CEIL|CEILING|CHAIN|CHAR|CHARACTER|CHARACTERISTICS|CHARACTERS|CHARACTER_LENGTH|CHARACTER_SET_CATALOG|CHARACTER_SET_NAME|CHARACTER_SET_SCHEMA|CHAR_LENGTH|CHECK|CHECKED|CHECKPOINT|CLASS|CLASS_ORIGIN|CLOB|CLOSE|CLUSTER|COALESCE|COBOL|COLLATE|COLLATION|COLLATION_CATALOG|COLLATION_NAME|COLLATION_SCHEMA|COLLECT|COLUMN|COLUMN_NAME|COMMAND_FUNCTION|COMMAND_FUNCTION_CODE|COMMENT|COMMIT|COMMITTED|COMPLETION|CONDITION|CONDITION_NUMBER|CONNECT|CONNECTION|CONNECTION_NAME|CONSTRAINT|CONSTRAINTS|CONSTRAINT_CATALOG|CONSTRAINT_NAME|CONSTRAINT_SCHEMA|CONSTRUCTOR|CONTAINS|CONTINUE|CONVERSION|CONVERT|COPY|CORR|CORRESPONDING|COUNT|COVAR_POP|COVAR_SAMP|CREATE|CREATEDB|CREATEROLE|CREATEUSER|CROSS|CSV|CUBE|CUME_DIST|CURRENT|CURRENT_DATE|CURRENT_DEFAULT_TRANSFORM_GROUP|CURRENT_PATH|CURRENT_ROLE|CURRENT_TIME|CURRENT_TIMESTAMP|CURRENT_TRANSFORM_GROUP_FOR_TYPE|CURRENT_USER|CURSOR|CURSOR_NAME|CYCLE|DATA|DATABASE|DATE|DATETIME_INTERVAL_CODE|DATETIME_INTERVAL_PRECISION|DAY|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFAULTS|DEFERRABLE|DEFERRED|DEFINED|DEFINER|DELETE|DELIMITER|DELIMITERS|DENSE_RANK|DEPTH|DEREF|DERIVED) *$/i.test(
      value
    ) as boolean;
  }
}

export class CreatePostgrestTableDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(31, { message: 'Table name must be less than 32 characters' })
  @MinLength(1, { message: 'Table name must be at least 1 character' })
  table_name: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Table must have at least 1 column' })
  columns: PostgrestTableColumnDto[];
}

export class PostgrestTableColumnDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => sanitizeInput(value))
  @MaxLength(31, { message: 'Column name must be less than 32 characters' })
  @MinLength(1, { message: 'Column name must be at least 1 character' })
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: 'Column name must start with a letter or underscore and can only contain letters, numbers and underscores',
  })
  @Validate(ReservedKeywordConstraint, {
    message: 'Column name cannot be a reserved keyword',
  })
  column_name: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => sanitizeInput(value))
  data_type: string;

  @IsString()
  @Transform(({ value }) => sanitizeInput(value))
  @IsOptional()
  constraint: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => sanitizeInput(value))
  default: string;
}

export class RenamePostgrestTableDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(31, { message: 'Table name must be less than 32 characters' })
  @MinLength(1, { message: 'Table name must be at least 1 character' })
  table_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(31, { message: 'Table name must be less than 32 characters' })
  @MinLength(1, { message: 'Table name must be at least 1 character' })
  new_table_name: string;
}
