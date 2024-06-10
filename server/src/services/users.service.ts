import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { FilesService } from '../services/files.service';
import { App } from 'src/entities/app.entity';
import { EntityManager, getRepository, Repository } from 'typeorm';
import { AppGroupPermission } from 'src/entities/app_group_permission.entity';
import { UserGroupPermission } from 'src/entities/user_group_permission.entity';
import { GroupPermission } from 'src/entities/group_permission.entity';
import { BadRequestException } from '@nestjs/common';
import { cleanObject, dbTransactionWrap } from 'src/helpers/utils.helper';
import { CreateFileDto } from '@dto/create-file.dto';
import { WORKSPACE_USER_STATUS } from 'src/helpers/user_lifecycle';
import { USER_ROLE } from '@module/user_resource_permissions/constants/group-permissions.constant';
import { GroupPermissionsServiceV2 } from './group_permissions.service.v2';
import { UserRoleService } from './user-role.service';
import { validateDeleteGroupUserOperation } from '@module/user_resource_permissions/utility/group-permissions.utility';
import { GroupPermissionsUtilityService } from '@module/user_resource_permissions/services/group-permissions.utility.service';
const uuid = require('uuid');
const bcrypt = require('bcrypt');

@Injectable()
export class UsersService {
  //Whole user service wherever group permissions are used need to be changed
  constructor(
    private readonly filesService: FilesService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(App)
    private appsRepository: Repository<App>,

    private groupPermissionsService: GroupPermissionsServiceV2,
    private userRoleService: UserRoleService,
    private groupPermissionsUtilityService: GroupPermissionsUtilityService
  ) {}

  async getCount(): Promise<number> {
    return this.usersRepository.count();
  }

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(
    email: string,
    organizationId?: string,
    status?: string | Array<string>,
    manager?: EntityManager
  ): Promise<User> {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      if (!organizationId) {
        return manager.findOne(User, {
          where: { email },
          relations: ['organization'],
        });
      } else {
        const statusList = status
          ? typeof status === 'object'
            ? status
            : [status]
          : [WORKSPACE_USER_STATUS.ACTIVE, WORKSPACE_USER_STATUS.INVITED, WORKSPACE_USER_STATUS.ARCHIVED];
        return await manager
          .createQueryBuilder(User, 'users')
          .innerJoinAndSelect(
            'users.organizationUsers',
            'organization_users',
            'organization_users.organizationId = :organizationId',
            { organizationId }
          )
          .where('organization_users.status IN(:...statusList)', {
            statusList,
          })
          .andWhere('users.email = :email', { email })
          .getOne();
      }
    }, manager);
  }

  async findByPasswordResetToken(token: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { forgotPasswordToken: token },
    });
  }

  async create(
    userParams: Partial<User>,
    organizationId: string,
    role: USER_ROLE,
    groups?: string[],
    existingUser?: User,
    isInvite?: boolean,
    defaultOrganizationId?: string,
    manager?: EntityManager
  ): Promise<User> {
    const { email, firstName, lastName, password, source, status, phoneNumber } = userParams;
    let user: User;

    await dbTransactionWrap(async (manager: EntityManager) => {
      if (!existingUser) {
        user = manager.create(User, {
          email,
          firstName,
          lastName,
          password,
          phoneNumber,
          source,
          status,
          invitationToken: isInvite ? uuid.v4() : null,
          defaultOrganizationId: defaultOrganizationId || organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await manager.save(user);
      } else {
        user = existingUser;
      }
      await this.userRoleService.addUserRole({ role, userId: user.id }, defaultOrganizationId || organizationId);
      await this.attachUserGroup(groups, organizationId, user.id, manager);
    }, manager);

    return user;
  }

  async attachUserGroup(
    groups: string[],
    organizationId: string,
    userId: string,
    manager?: EntityManager
  ): Promise<void> {
    if (!groups) return;
    await dbTransactionWrap(async (manager: EntityManager) => {
      await Promise.all(
        groups.map(async (groupId) => {
          await this.groupPermissionsService.addGroupUsers({ userIds: [userId], groupId }, organizationId, manager);
        })
      );
    }, manager);
  }

  async update(userId: string, params: any, manager?: EntityManager, organizationId?: string) {
    const { forgotPasswordToken, password, firstName, lastName, addGroups, removeGroups, source, role } = params;

    const hashedPassword = password ? bcrypt.hashSync(password, 10) : undefined;

    const updatableParams = {
      forgotPasswordToken,
      firstName,
      lastName,
      password: hashedPassword,
      source,
    };

    // removing keys with undefined values
    cleanObject(updatableParams);

    return await dbTransactionWrap(async (manager: EntityManager) => {
      await manager.update(User, userId, updatableParams);
      const user = await manager.findOne(User, { where: { id: userId } });

      await this.removeUserGroupPermissionsIfExists(manager, user, removeGroups, organizationId);
      if (role) await this.userRoleService.editDefaultGroupUserRole({ userId, newRole: role }, organizationId, manager);
      await this.attachUserGroup(addGroups, organizationId, userId, manager);
      return user;
    }, manager);
  }

  async updateUser(userId: string, updatableParams: Partial<User>, manager?: EntityManager) {
    if (updatableParams.password) {
      updatableParams.password = bcrypt.hashSync(updatableParams.password, 10);
    }
    await dbTransactionWrap(async (manager: EntityManager) => {
      await manager.update(User, userId, updatableParams);
    }, manager);
  }

  //TODO: Remove this function if not needed
  // async addUserGroupPermissions(manager: EntityManager, user: User, addGroups: string[], organizationId?: string) {
  //   const orgId = organizationId || user.defaultOrganizationId;
  //   if (addGroups) {
  //     const orgGroupPermissions = await this.groupPermissionsForOrganization(orgId);

  //     for (const group of addGroups) {
  //       const orgGroupPermission = orgGroupPermissions.find((permission) => permission.group == group);

  //       if (!orgGroupPermission) {
  //         throw new BadRequestException(`${group} group does not exist for current organization`);
  //       }
  //       await dbTransactionWrap(async (manager: EntityManager) => {
  //         const userGroupPermission = manager.create(UserGroupPermission, {
  //           groupPermissionId: orgGroupPermission.id,
  //           userId: user.id,
  //         });
  //         await manager.save(userGroupPermission);
  //       }, manager);
  //     }
  //   }
  // }

  async removeUserGroupPermissionsIfExists(
    manager: EntityManager,
    user: User,
    removeGroups: string[],
    organizationId?: string
  ): Promise<void> {
    const orgId = organizationId || user.defaultOrganizationId;
    if (!removeGroups) return;
    await dbTransactionWrap(async (manager: EntityManager) => {
      const groupPermissions = await this.groupPermissionsService.getAllUserGroups(user.id, orgId);
      const groupsToRemove = groupPermissions.filter((permission) => removeGroups.includes(permission.id));
      await Promise.all(
        groupsToRemove.map(async (group) => {
          validateDeleteGroupUserOperation(group);
          const groupUser = group.groupUsers[0];
          this.groupPermissionsService.deleteGroupUser(groupUser.id, manager);
        })
      );
    }, manager);
  }

  //TODO: Remove this function if not needed
  async throwErrorIfUserIsLastActiveAdmin(user: User, organizationId: string) {
    const result = await this.groupPermissionsUtilityService.getRoleUsersList(USER_ROLE.ADMIN, organizationId);
    const isAdmin = result.find((userItem) => userItem.id === user.id);

    if (isAdmin && result.length <= 2) throw new BadRequestException('Atleast one active admin is required');
  }

  //TODO: Remove this function if not needed
  async hasGroup(user: User, group: string, organizationId?: string, manager?: EntityManager): Promise<boolean> {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      const result = await manager
        .createQueryBuilder(GroupPermission, 'group_permissions')
        .innerJoin('group_permissions.userGroupPermission', 'user_group_permissions')
        .where('group_permissions.organization_id = :organizationId', {
          organizationId: organizationId || user.organizationId,
        })
        .andWhere('group_permissions.group = :group ', { group })
        .andWhere('user_group_permissions.user_id = :userId', { userId: user.id })
        .getCount();

      return result > 0;
    }, manager);
  }

  //Moving to ability servoce
  //////////---------------------------------------------------------------
  async userCan(user: User, action: string, entityName: string, resourceId?: string): Promise<boolean> {
    //get all permissions -> Resource
    switch (entityName) {
      case 'App':
        return await this.canUserPerformActionOnApp(user, action, resourceId);
      case 'User':
      case 'Plugin':
      case 'GlobalDataSource':
        return await this.hasGroup(user, 'admin');

      case 'Thread':
      case 'Comment':
        return await this.canUserPerformActionOnApp(user, 'update', resourceId);

      case 'Folder':
        return await this.canUserPerformActionOnFolder(user, action);

      //TODO: Is this organization constant variable is deprecated
      case 'OrgEnvironmentVariable':
        return await this.canUserPerformActionOnEnvironmentVariable(user, action);

      case 'OrganizationConstant':
        return await this.canUserPerformActionOnOrgEnvironmentConstants(user, action);

      default:
        return false;
    }
  }

  async canUserPerformActionOnApp(user: User, action: string, appId?: string): Promise<boolean> {
    let permissionGrant: boolean;

    switch (action) {
      case 'create':
        permissionGrant = this.canAnyGroupPerformAction('appCreate', await this.groupPermissions(user));
        break;
      case 'read':
      case 'update':
        permissionGrant =
          this.canAnyGroupPerformAction(action, await this.appGroupPermissions(user, appId)) ||
          (await this.isUserOwnerOfApp(user, appId));
        break;
      case 'delete':
        permissionGrant =
          this.canAnyGroupPerformAction('delete', await this.appGroupPermissions(user, appId)) ||
          this.canAnyGroupPerformAction('appDelete', await this.groupPermissions(user)) ||
          (await this.isUserOwnerOfApp(user, appId));
        break;
      default:
        permissionGrant = false;
        break;
    }

    return permissionGrant;
  }

  async canUserPerformActionOnFolder(user: User, action: string): Promise<boolean> {
    let permissionGrant: boolean;

    switch (action) {
      case 'create':
        permissionGrant = this.canAnyGroupPerformAction('folderCreate', await this.groupPermissions(user));
        break;
      case 'update':
        permissionGrant = this.canAnyGroupPerformAction('folderUpdate', await this.groupPermissions(user));
        break;
      case 'delete':
        permissionGrant = this.canAnyGroupPerformAction('folderDelete', await this.groupPermissions(user));
        break;
      default:
        permissionGrant = false;
        break;
    }

    return permissionGrant;
  }

  async canUserPerformActionOnEnvironmentVariable(user: User, action: string): Promise<boolean> {
    let permissionGrant: boolean;

    switch (action) {
      case 'create':
        permissionGrant = this.canAnyGroupPerformAction(
          'orgEnvironmentVariableCreate',
          await this.groupPermissions(user)
        );
        break;
      case 'update':
        permissionGrant = this.canAnyGroupPerformAction(
          'orgEnvironmentVariableUpdate',
          await this.groupPermissions(user)
        );
        break;
      case 'delete':
        permissionGrant = this.canAnyGroupPerformAction(
          'orgEnvironmentVariableDelete',
          await this.groupPermissions(user)
        );
        break;
      default:
        permissionGrant = false;
        break;
    }

    return permissionGrant;
  }

  async canUserPerformActionOnOrgEnvironmentConstants(user: User, action: string): Promise<boolean> {
    let permissionGrant: boolean;

    switch (action) {
      case 'create':
      case 'update':
        permissionGrant = this.canAnyGroupPerformAction(
          'orgEnvironmentConstantCreate',
          await this.groupPermissions(user)
        );
        break;

      case 'delete':
        permissionGrant = this.canAnyGroupPerformAction(
          'orgEnvironmentConstantDelete',
          await this.groupPermissions(user)
        );
        break;
      default:
        permissionGrant = false;
        break;
    }

    return permissionGrant;
  }

  //----------_Till Here ------------------------------------------

  async isUserOwnerOfApp(user: User, appId: string): Promise<boolean> {
    const app: App = await this.appsRepository.findOne({
      where: {
        id: appId,
        userId: user.id,
      },
    });
    return !!app && app.organizationId === user.organizationId;
  }

  async returnOrgIdOfAnApp(slug: string): Promise<{ organizationId: string; isPublic: boolean }> {
    let app: App;
    try {
      app = await this.appsRepository.findOneOrFail(slug);
    } catch (error) {
      app = await this.appsRepository.findOne({
        slug,
      });
    }

    return { organizationId: app?.organizationId, isPublic: app?.isPublic };
  }

  async addAvatar(userId: number, imageBuffer: Buffer, filename: string) {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      const user = await manager.findOne(User, userId);
      const currentAvatarId = user.avatarId;
      const createFileDto = new CreateFileDto();
      createFileDto.filename = filename;
      createFileDto.data = imageBuffer;
      const avatar = await this.filesService.create(createFileDto, manager);

      await manager.update(User, userId, {
        avatarId: avatar.id,
      });

      if (currentAvatarId) {
        await this.filesService.remove(currentAvatarId, manager);
      }
      return avatar;
    });
  }

  //---------This neeed to shift to ability service
  canAnyGroupPerformAction(action: string, permissions: AppGroupPermission[] | GroupPermission[]): boolean {
    return permissions.some((p) => p[action]);
  }

  /// Need to move to ability service with new logic
  async groupPermissions(user: User, manager?: EntityManager): Promise<GroupPermission[]> {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      const orgUserGroupPermissions = await this.userGroupPermissions(user, user.organizationId, manager);
      const groupIds = orgUserGroupPermissions.map((p) => p.groupPermissionId);

      return await manager.findByIds(GroupPermission, groupIds);
    }, manager);
  }

  // Remove and move to ability  service
  async groupPermissionsForOrganization(organizationId: string) {
    const groupPermissionRepository = getRepository(GroupPermission);

    return await groupPermissionRepository.find({ organizationId });
  }

  //Move to group permissions
  async appGroupPermissions(user: User, appId?: string, manager?: EntityManager): Promise<AppGroupPermission[]> {
    const orgUserGroupPermissions = await this.userGroupPermissions(user, user.organizationId, manager);
    const groupIds = orgUserGroupPermissions.map((p) => p.groupPermissionId);

    if (!groupIds || groupIds.length === 0) {
      return [];
    }
    return await dbTransactionWrap(async (manager: EntityManager) => {
      const query = manager
        .createQueryBuilder(AppGroupPermission, 'app_group_permissions')
        .innerJoin(
          'app_group_permissions.groupPermission',
          'group_permissions',
          'group_permissions.organization_id = :organizationId',
          {
            organizationId: user.organizationId,
          }
        )
        .where('app_group_permissions.groupPermissionId IN (:...groupIds)', { groupIds });

      if (appId) {
        query.andWhere('app_group_permissions.appId = :appId', { appId });
      }
      return await query.getMany();
    }, manager);
  }

  // Move to group Permissions
  async userGroupPermissions(
    user: User,
    organizationId?: string,
    manager?: EntityManager
  ): Promise<UserGroupPermission[]> {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      return await manager
        .createQueryBuilder(UserGroupPermission, 'user_group_permissions')
        .innerJoin('user_group_permissions.groupPermission', 'group_permissions')
        .where('group_permissions.organization_id = :organizationId', {
          organizationId: organizationId || user.organizationId,
        })
        .andWhere('user_group_permissions.user_id = :userId', { userId: user.id })
        .getMany();
    }, manager);
  }
}
