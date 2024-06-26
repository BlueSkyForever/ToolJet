import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupPermission } from '../../../src/entities/group_permission.entity';
import { UserGroupPermission } from 'src/entities/user_group_permission.entity';
import { AppGroupPermission } from 'src/entities/app_group_permission.entity';
import { GroupPermissionsController } from '../../controllers/group_permissions.controller';
import { GroupPermissionsService } from '../../services/group_permissions.service';
import { CaslModule } from '../casl/casl.module';
import { UsersService } from '@services/users.service';
import { User } from 'src/entities/user.entity';
import { OrganizationUser } from 'src/entities/organization_user.entity';
import { Organization } from 'src/entities/organization.entity';
import { App } from 'src/entities/app.entity';
import { File } from 'src/entities/file.entity';
import { FilesService } from '@services/files.service';
import { UserResourcePermissionsModule } from '@module/user_resource_permissions/user_resource_permissions.module';

@Module({
  //Depreciated
  controllers: [GroupPermissionsController],
  imports: [
    UserResourcePermissionsModule,
    TypeOrmModule.forFeature([
      GroupPermission,
      UserGroupPermission,
      AppGroupPermission,
      User,
      OrganizationUser,
      Organization,
      App,
      File,
    ]),
    CaslModule,
  ],
  providers: [GroupPermissionsService, FilesService, UsersService],
})
export class GroupPermissionsModule {}
