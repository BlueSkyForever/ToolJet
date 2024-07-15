import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportExportResourcesController } from '@controllers/import_export_resources.controller';
import { TooljetDbService } from '@services/tooljet_db.service';
import { ImportExportResourcesService } from '@services/import_export_resources.service';
import { AppImportExportService } from '@services/app_import_export.service';
import { TooljetDbImportExportService } from '@services/tooljet_db_import_export_service';
import { DataSourcesService } from '@services/data_sources.service';
import { AppEnvironmentService } from '@services/app_environments.service';
import { Plugin } from 'src/entities/plugin.entity';
import { PluginsHelper } from 'src/helpers/plugins.helper';
import { CredentialsService } from '@services/credentials.service';
import { DataSource } from 'src/entities/data_source.entity';
import { PluginsModule } from '../plugins/plugins.module';
import { EncryptionService } from '@services/encryption.service';
import { Credential } from '../../../src/entities/credential.entity';
import { CaslModule } from '../casl/casl.module';
import { AppsService } from '@services/apps.service';
import { App } from 'src/entities/app.entity';
import { AppVersion } from 'src/entities/app_version.entity';
import { AppUser } from 'src/entities/app_user.entity';

const imports = [
  PluginsModule,
  CaslModule,
  TypeOrmModule.forFeature([AppUser, AppVersion, App, Credential, Plugin, DataSource]),
];

@Module({
  imports,
  controllers: [ImportExportResourcesController],
  providers: [
    EncryptionService,
    ImportExportResourcesService,
    AppImportExportService,
    TooljetDbImportExportService,
    DataSourcesService,
    AppEnvironmentService,
    TooljetDbService,
    PluginsHelper,
    AppsService,
    CredentialsService,
  ],
  exports: [ImportExportResourcesService],
})
export class ImportExportResourcesModule {}
