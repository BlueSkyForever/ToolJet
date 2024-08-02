import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { OrganizationsService } from './organizations.service';
import { User } from '../entities/user.entity';
import { UserSessions } from '../entities/user_sessions.entity';
import { OrganizationUsersService } from './organization_users.service';
import { EmailService } from './email.service';
import { decamelizeKeys } from 'humps';
import { Organization } from 'src/entities/organization.entity';
import { ConfigService } from '@nestjs/config';
import { SSOConfigs } from 'src/entities/sso_config.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository, getManager } from 'typeorm';
import { OrganizationUser } from 'src/entities/organization_user.entity';
import { CreateAdminDto, CreateUserDto } from '@dto/user.dto';
import { AcceptInviteDto } from '@dto/accept-organization-invite.dto';
import {
  getUserErrorMessages,
  getUserStatusAndSource,
  isPasswordMandatory,
  USER_STATUS,
  lifecycleEvents,
  SOURCE,
  URL_SSO_SOURCE,
  WORKSPACE_USER_STATUS,
  WORKSPACE_STATUS,
  WORKSPACE_USER_SOURCE,
} from 'src/helpers/user_lifecycle';
import {
  dbTransactionWrap,
  isSuperAdmin,
  fullName,
  generateInviteURL,
  generateNextNameAndSlug,
  generateOrgInviteURL,
  isValidDomain,
} from 'src/helpers/utils.helper';
import { InstanceSettingsService } from '@instance_settings/instance_settings.service';
import { MetadataService } from './metadata.service';
import { CookieOptions, Response } from 'express';
import { SessionService } from './session.service';
import { RequestContext } from 'src/models/request-context.model';
import * as requestIp from 'request-ip';
import { uuid4 } from '@sentry/utils';
import got from 'got/dist/source';
import { ActivateAccountWithTokenDto } from '@dto/activate-account-with-token.dto';
import { AppAuthenticationDto, AppSignupDto } from '@dto/app-authentication.dto';
import { SIGNUP_ERRORS } from 'src/helpers/errors.constants';
const bcrypt = require('bcrypt');
const uuid = require('uuid');
import { INSTANCE_USER_SETTINGS, INSTANCE_SYSTEM_SETTINGS } from '@instance_settings/constants';
import { ResendInviteDto } from '@dto/resend-invite.dto';
import { JwtService } from './jwt.service';
import { App } from 'src/entities/app.entity';
import { AuditLoggerService } from '@audit_logs/audit_logger.service';
import { USER_ROLE } from '@module/user_resource_permissions/constants/group-permissions.constant';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(OrganizationUser)
    private organizationUsersRepository: Repository<OrganizationUser>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private organizationsService: OrganizationsService,
    private organizationUsersService: OrganizationUsersService,
    private emailService: EmailService,
    private auditLoggerService: AuditLoggerService,
    private instanceSettingsService: InstanceSettingsService,
    private metadataService: MetadataService,
    private configService: ConfigService,
    private sessionService: SessionService
  ) {}

  verifyToken(token: string) {
    try {
      const signedJwt = this.jwtService.verifyToken(token);
      return signedJwt;
    } catch (err) {
      return null;
    }
  }

  private async validateUser(email: string, password: string, organizationId?: string): Promise<User> {
    const user = await this.jwtService.findByEmail(email, organizationId, [
      WORKSPACE_USER_STATUS.ACTIVE,
      WORKSPACE_USER_STATUS.ARCHIVED,
    ]);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new UnauthorizedException(getUserErrorMessages(user.status));
    }

    if (organizationId) {
      const organizationUser = user.organizationUsers.find(
        (organizationUser) => organizationUser.organizationId === organizationId
      );
      if (organizationUser && organizationUser.status === WORKSPACE_USER_STATUS.ARCHIVED) {
        throw new UnauthorizedException(
          'You have been archived from this workspace. Sign in to another workspace or contact admin to know more.'
        );
      }
    }

    const passwordRetryConfig = this.configService.get<string>('PASSWORD_RETRY_LIMIT');

    const passwordRetryAllowed = passwordRetryConfig ? parseInt(passwordRetryConfig) : 5;

    if (
      this.configService.get<string>('DISABLE_PASSWORD_RETRY_LIMIT') !== 'true' &&
      user.passwordRetryCount >= passwordRetryAllowed
    ) {
      throw new UnauthorizedException(
        'Maximum password retry limit reached, please reset your password using forgot password option'
      );
    }
    if (!(await bcrypt.compare(password, user.password))) {
      await this.usersService.updateUser(user.id, { passwordRetryCount: user.passwordRetryCount + 1 });
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async getSessionDetails(user: User, appId?: string, workspaceSlug?: string) {
    let appData: { organizationId: string; isPublic: boolean; isReleased: boolean };
    let currentOrganization: Organization;
    if (appId) {
      appData = await this.retrieveAppDataUsingSlug(appId);
    }

    if (workspaceSlug || appData?.organizationId) {
      const organization = await this.jwtService.fetchOrganization(workspaceSlug || appData.organizationId);
      if (!organization) {
        throw new NotFoundException("Couldn't found workspace. workspace id or slug is incorrect!.");
      }
      const activeMemberOfOrganization = await this.organizationUsersService.isTheUserIsAnActiveMemberOfTheWorkspace(
        user.id,
        organization.id
      );
      if (activeMemberOfOrganization) currentOrganization = organization;
      const alreadyWorkspaceSessionAvailable = user.organizationIds?.includes(appData?.organizationId);
      const orgIdNeedsToBeUpdatedForApplicationSession =
        appData && appData.organizationId !== user.defaultOrganizationId && alreadyWorkspaceSessionAvailable;
      if (orgIdNeedsToBeUpdatedForApplicationSession) {
        /* If the app's organization id is there in the JWT and user default organization id is different, then update it */
        await this.usersService.updateUser(user.id, { defaultOrganizationId: appData.organizationId });
      }
    }
    return await this.generateSessionPayload(user, currentOrganization, appData);
  }

  async login(response: Response, appAuthDto: AppAuthenticationDto, organizationId?: string, loggedInUser?: User) {
    let organization: Organization;
    const { email, password, redirectTo } = appAuthDto;

    const isInviteRedirect =
      redirectTo?.startsWith('/organization-invitations/') || redirectTo?.startsWith('/invitations/');

    let user: User;
    if (isInviteRedirect) {
      /* give access to the default organization */
      user = await this.jwtService.findByEmail(email, organizationId, [WORKSPACE_USER_STATUS.INVITED]);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      organizationId = null;
    } else {
      user = await this.validateUser(email, password, organizationId);
    }

    const allowPersonalWorkspace =
      isSuperAdmin(user) ||
      (await this.instanceSettingsService.getSettings(INSTANCE_USER_SETTINGS.ALLOW_PERSONAL_WORKSPACE)) === 'true';

    return await dbTransactionWrap(async (manager: EntityManager) => {
      if (!organizationId) {
        // Global login
        // Determine the organization to be loaded

        const organizationList: Organization[] = await this.organizationsService.findOrganizationWithLoginSupport(
          user,
          'form'
        );

        const defaultOrgDetails: Organization = organizationList?.find((og) => og.id === user.defaultOrganizationId);
        if (defaultOrgDetails) {
          // default organization form login enabled
          organization = defaultOrgDetails;
        } else if (organizationList?.length > 0) {
          // default organization form login not enabled, picking first one from form enabled list
          organization = organizationList[0];
        } else if (allowPersonalWorkspace && !isInviteRedirect) {
          // no form login enabled organization available for user - creating new one
          const { name, slug } = generateNextNameAndSlug('My workspace');
          organization = await this.organizationsService.create(name, slug, user, manager);
        } else {
          if (!isInviteRedirect) throw new UnauthorizedException('User is not assigned to any workspaces');
        }

        if (organization) user.organizationId = organization.id;
      } else {
        // organization specific login
        // No need to validate user status, validateUser() already covers it
        user.organizationId = organizationId;

        organization = await this.organizationsService.get(user.organizationId);

        const formConfigs: SSOConfigs = organization?.ssoConfigs?.find((sso) => sso.sso === 'form');

        if (!formConfigs?.enabled) {
          // no configurations in organization side or Form login disabled for the organization
          throw new UnauthorizedException('Password login is disabled for the organization');
        }
      }

      const shouldUpdateDefaultOrgId =
        user.defaultOrganizationId && user.organizationId && user.defaultOrganizationId !== user.organizationId;
      const updateData = {
        ...(shouldUpdateDefaultOrgId && { defaultOrganizationId: organization.id }),
        passwordRetryCount: 0,
      };

      await this.usersService.updateUser(user.id, updateData, manager);

      if (!isInviteRedirect) {
        await this.auditLoggerService.perform(
          {
            userId: user.id,
            organizationId: organization.id,
            resourceId: user.id,
            resourceType: ResourceTypes.USER,
            resourceName: user.email,
            actionType: ActionTypes.USER_LOGIN,
          },
          manager
        );
      }

      return await this.generateLoginResultPayload(response, user, organization, false, true, loggedInUser);
    });
  }

  async switchOrganization(response: Response, newOrganizationId: string, user: User, isNewOrganization?: boolean) {
    if (!(isNewOrganization || user.isPasswordLogin || user.isSSOLogin)) {
      throw new UnauthorizedException();
    }
    const newUser = await this.jwtService.findByEmail(user.email, newOrganizationId, WORKSPACE_USER_STATUS.ACTIVE);

    /* User doesn't have access to this workspace */
    if (!newUser && !isSuperAdmin(newUser)) {
      throw new UnauthorizedException("User doesn't have access to this workspace");
    }
    newUser.organizationId = newOrganizationId;

    const organization: Organization = await this.organizationsService.get(newUser.organizationId);

    const formConfigs: SSOConfigs = organization?.ssoConfigs?.find((sso) => sso.sso === 'form');

    if (
      !isSuperAdmin(newUser) && // bypassing login mode checks for super admin
      ((user.isPasswordLogin && !formConfigs?.enabled) || (user.isSSOLogin && !organization.inheritSSO))
    ) {
      // no configurations in organization side or Form login disabled for the organization
      throw new UnauthorizedException('Please log in to continue');
    }

    return await dbTransactionWrap(async (manager: EntityManager) => {
      // Updating default organization Id
      await this.usersService.updateUser(newUser.id, { defaultOrganizationId: newUser.organizationId }, manager);

      return await this.generateLoginResultPayload(
        response,
        user,
        organization,
        user.isSSOLogin,
        user.isPasswordLogin,
        user
      );
    });
  }

  async authorizeOrganization(user: User) {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      if (user.defaultOrganizationId !== user.organizationId)
        await this.usersService.updateUser(user.id, { defaultOrganizationId: user.organizationId }, manager);

      const organization = await this.organizationsService.get(user.organizationId);

      return decamelizeKeys({
        currentOrganizationId: user.organizationId,
        currentOrganizationSlug: organization.slug,
        currentOrganizationName: organization.name,
        admin: await this.usersService.hasGroup(user, 'admin', null, manager),
        super_admin: user.userType === 'instance',
        groupPermissions: await this.usersService.groupPermissions(user, manager),
        appGroupPermissions: await this.usersService.appGroupPermissions(user, null, manager),
        dataSourceGroupPermissions: await this.usersService.dataSourceGroupPermissions(user, null, manager),
        currentUser: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarId: user.avatarId,
          ssoUserInfo: user.userDetails?.ssoUserInfo,
        },
      });
    });
  }

  async resendEmail(body: ResendInviteDto) {
    const { email, organizationId, redirectTo } = body;
    if (!email) {
      throw new BadRequestException();
    }
    const existingUser = await this.jwtService.findByEmail(email);

    if (existingUser?.status === USER_STATUS.ARCHIVED) {
      throw new NotAcceptableException('User has been archived, please contact the administrator');
    }

    if (!organizationId && existingUser?.organizationUsers?.some((ou) => ou.status === WORKSPACE_USER_STATUS.ACTIVE)) {
      throw new NotAcceptableException('Email already exists');
    }

    let organizationUser: OrganizationUser;
    if (organizationId) {
      /* Workspace signup invitation email */
      organizationUser = existingUser.organizationUsers.find(
        (organizationUser) => organizationUser.organizationId === organizationId
      );
      if (organizationUser.status === WORKSPACE_USER_STATUS.ACTIVE) {
        throw new NotAcceptableException('User already exists in the workspace.');
      }
      if (organizationUser.status === WORKSPACE_USER_STATUS.ARCHIVED) {
        throw new NotAcceptableException('User has been archived, please contact the administrator');
      }
    }

    if (organizationUser) {
      const invitedOrganization = await this.organizationsService.get(organizationUser.organizationId);
      if (existingUser.invitationToken) {
        /* Not activated. */
        this.emailService
          .sendWelcomeEmail(
            existingUser.email,
            existingUser.firstName,
            existingUser.invitationToken,
            organizationUser.invitationToken,
            organizationUser.organizationId,
            invitedOrganization.name,
            null,
            redirectTo
          )
          .catch((err) => console.error('Error while sending welcome mail', err));
        return;
      } else {
        /* Already activated */
        this.emailService
          .sendOrganizationUserWelcomeEmail(
            existingUser.email,
            existingUser.firstName,
            null,
            organizationUser.invitationToken,
            invitedOrganization.name,
            organizationUser.organizationId,
            redirectTo
          )
          .catch((err) => console.error(err));
        return;
      }
    }

    if (existingUser?.invitationToken) {
      this.emailService
        .sendWelcomeEmail(existingUser.email, existingUser.firstName, existingUser.invitationToken)
        .catch((err) => console.error('Error while sending welcome mail', err));
      return;
    }
  }

  async signup(appSignUpDto: AppSignupDto, response: Response) {
    const { name, email, password, organizationId, redirectTo } = appSignUpDto;

    return dbTransactionWrap(async (manager: EntityManager) => {
      // Check if the configs allows user signups
      if (this.configService.get<string>('DISABLE_SIGNUPS') === 'true') {
        throw new NotAcceptableException();
      }

      const existingUser = await this.jwtService.findByEmail(email);
      let signingUpOrganization: Organization;

      if (organizationId) {
        signingUpOrganization = await this.organizationsService.get(organizationId);
        if (!signingUpOrganization) {
          throw new NotFoundException('Could not found organization details. Please verify the orgnization id');
        }
        /* Check if the workspace allows user signup or not */
        const { enableSignUp, domain } = signingUpOrganization;
        if (!enableSignUp) {
          throw new ForbiddenException('Workspace signup has been disabled. Please contact the workspace admin.');
        }
        if (!isValidDomain(email, domain)) {
          throw new ForbiddenException('You cannot sign up using the email address - Domain verification failed.');
        }
      }

      const names = { firstName: '', lastName: '' };
      if (name) {
        const [firstName, ...rest] = name.split(' ');
        names['firstName'] = firstName;
        if (rest.length != 0) {
          const lastName = rest.join(' ');
          names['lastName'] = lastName;
        }
      }
      const { firstName, lastName } = names;
      const userParams = { email, password, firstName, lastName };

      if (existingUser) {
        return await this.whatIfTheSignUpIsAtTheWorkspaceLevel(
          existingUser,
          signingUpOrganization,
          userParams,
          response,
          redirectTo,
          manager
        );
      } else {
        return await this.createUserOrPersonalWorkspace(
          userParams,
          existingUser,
          signingUpOrganization,
          redirectTo,
          manager
        );
      }
    });
  }

  createUserOrPersonalWorkspace = async (
    userParams: { email: string; password: string; firstName: string; lastName: string },
    existingUser: User,
    signingUpOrganization: Organization = null,
    redirectTo?: string,
    manager?: EntityManager
  ) => {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      const { email, password, firstName, lastName } = userParams;
      /* Create personal workspace */
      const isPersonalWorkspaceEnabled =
        (await this.instanceSettingsService.getSettings(INSTANCE_USER_SETTINGS.ALLOW_PERSONAL_WORKSPACE)) === 'true';

      let personalWorkspace: Organization;
      if (isPersonalWorkspaceEnabled) {
        const { name, slug } = generateNextNameAndSlug('My workspace');
        personalWorkspace = await this.organizationsService.create(name, slug, null, manager);
      }

      const organizationId = personalWorkspace ? personalWorkspace.id : signingUpOrganization.id;
      const organizationGroups = personalWorkspace ? ['all_users', 'admin'] : ['all_users'];
      /* Create the user or attach user groups to the user */
      const lifeCycleParms = signingUpOrganization
        ? getUserStatusAndSource(lifecycleEvents.USER_WORKSPACE_SIGN_UP)
        : getUserStatusAndSource(lifecycleEvents.USER_SIGN_UP);
      const user = await this.usersService.create(
        {
          email,
          password,
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...lifeCycleParms,
        },
        organizationId,
        organizationGroups,
        existingUser,
        true,
        null,
        manager,
        !isPersonalWorkspaceEnabled
      );
      if (personalWorkspace) await this.organizationUsersService.create(user, personalWorkspace, true, manager);
      if (signingUpOrganization) {
        /* Attach the user and user groups to the organization */
        const organizationUser = await this.organizationUsersService.create(
          user,
          signingUpOrganization,
          true,
          manager,
          WORKSPACE_USER_SOURCE.SIGNUP
        );
        if (signingUpOrganization.id !== organizationId)
          /* To avoid creating the groups again. */
          await this.usersService.attachUserGroup(['all_users'], signingUpOrganization.id, user.id, false, manager);

        await this.usersService.validateLicense(manager);
        this.emailService
          .sendWelcomeEmail(
            user.email,
            user.firstName,
            user.invitationToken,
            organizationUser.invitationToken,
            signingUpOrganization.id,
            signingUpOrganization.name,
            null,
            redirectTo
          )
          .catch((err) => console.error('Error while sending welcome mail', err));

        await this.auditLoggerService.perform(
          {
            userId: user.id,
            organizationId: signingUpOrganization.id,
            resourceId: user.id,
            resourceType: ResourceTypes.USER,
            resourceName: user.email,
            actionType: ActionTypes.USER_SIGNUP,
          },
          manager
        );
        return {};
      } else {
        await this.usersService.validateLicense(manager);
        this.emailService
          .sendWelcomeEmail(user.email, user.firstName, user.invitationToken)
          .catch((err) => console.error('Error while sending welcome mail', err));
        await this.auditLoggerService.perform(
          {
            userId: user.id,
            organizationId: personalWorkspace?.id,
            resourceId: user.id,
            resourceType: ResourceTypes.USER,
            resourceName: user.email,
            actionType: ActionTypes.USER_SIGNUP,
          },
          manager
        );
        return {};
      }
    }, manager);
  };

  async processOrganizationSignup(
    response: Response,
    user: User,
    organizationParams: Partial<OrganizationUser>,
    manager?: EntityManager,
    defaultOrganization = null,
    source = 'signup'
  ) {
    const { invitationToken, organizationId } = organizationParams;
    /* Active user want to signup to the organization case */
    const passwordLogin = source === 'signup';
    const session = defaultOrganization
      ? await this.generateLoginResultPayload(
          response,
          user,
          defaultOrganization,
          !passwordLogin,
          passwordLogin,
          null,
          manager,
          organizationId
        )
      : await this.generateInviteSignupPayload(response, user, source, manager);
    const organizationInviteUrl = generateOrgInviteURL(invitationToken, organizationId, false);
    return { ...session, organizationInviteUrl };
  }

  sendOrgInvite = (
    userParams: { email: string; firstName: string },
    signingUpOrganizationName: string,
    organizationId: string,
    invitationToken: string,
    redirectTo?: string,
    throwError = true
  ) => {
    this.emailService
      .sendOrganizationUserWelcomeEmail(
        userParams.email,
        userParams.firstName,
        null,
        invitationToken,
        signingUpOrganizationName,
        organizationId,
        redirectTo
      )
      .catch((err) => console.error(err));
    if (throwError) {
      throw new NotAcceptableException(
        'The user is already registered. Please check your inbox for the activation link'
      );
    } else {
      return {};
    }
  };

  whatIfTheSignUpIsAtTheWorkspaceLevel = async (
    existingUser: User,
    signingUpOrganization: Organization,
    userParams: { firstName: string; lastName: string; password: string },
    response: Response,
    redirectTo?: string,
    manager?: EntityManager
  ) => {
    const { firstName, lastName, password } = userParams;
    const organizationId: string = signingUpOrganization?.id;
    const organizationUsers = existingUser.organizationUsers;
    const alreadyInvitedUserByAdmin = organizationUsers.find(
      (organizationUser: OrganizationUser) =>
        organizationUser.organizationId === organizationId && organizationUser.status === WORKSPACE_USER_STATUS.INVITED
    );
    const hasActiveWorkspaces = organizationUsers.some(
      (organizationUser: OrganizationUser) => organizationUser.status === WORKSPACE_USER_STATUS.ACTIVE
    );
    const hasSomeWorkspaceInvites = organizationUsers.some(
      (organizationUser: OrganizationUser) => organizationUser.status === WORKSPACE_USER_STATUS.INVITED
    );
    const isAlreadyActiveInWorkspace = organizationUsers.find(
      (organizationUser: OrganizationUser) =>
        organizationUser.organizationId === organizationId && organizationUser.status === WORKSPACE_USER_STATUS.ACTIVE
    );

    /*
    NOTE: Active user and account is different
    active account -> user.status == active && invitation_token is null
    active user -> has active account + active workspace (workspace status is active and invitation token is null)
    */

    /* User who missed the organization invite flow / user already got invite from the admin and want's to use workspace signup instead  */
    const activeAccountButnotActiveInWorkspace = !!alreadyInvitedUserByAdmin && !existingUser.invitationToken;
    const invitedButNotActivated = !!alreadyInvitedUserByAdmin && !!existingUser.invitationToken;
    const activeUserWantsToSignUpToWorkspace = hasActiveWorkspaces && !!organizationId && !isAlreadyActiveInWorkspace;
    const hasWorkspaceInviteButUserWantsInstanceSignup =
      !!existingUser?.invitationToken && hasSomeWorkspaceInvites && !organizationId;
    const isUserAlreadyExisted = !!isAlreadyActiveInWorkspace || hasActiveWorkspaces || !existingUser?.invitationToken;
    const workspaceSignupForInstanceSignedUpUserButNotActive =
      !!organizationId && !!existingUser?.invitationToken && !alreadyInvitedUserByAdmin;

    switch (true) {
      case workspaceSignupForInstanceSignedUpUserButNotActive:
      case invitedButNotActivated: {
        let organizationUser: OrganizationUser;
        if (alreadyInvitedUserByAdmin) {
          /*
            CASE: User is new and already got an invite from admin. But he choose to signup from workspace signup page
            Response: Send the org invite again and thorw an error
          */
          organizationUser = alreadyInvitedUserByAdmin;
        } else {
          /* 
            CASE: User signed up throug the instance page, but don't want to continue the invite floe. So decided to go with workspace signup 
            Response: Add the user to the workspace and send the organization and account invite again (eg: /invitations/<>/workspaces/<>).
          */
          organizationUser = await this.addUserToTheWorkspace(existingUser, signingUpOrganization, manager);
          await this.usersService.validateLicense(manager);
        }
        this.emailService
          .sendWelcomeEmail(
            existingUser.email,
            existingUser.firstName,
            existingUser.invitationToken,
            organizationUser.invitationToken,
            organizationUser.organizationId,
            signingUpOrganization.name,
            null,
            redirectTo
          )
          .catch((err) => console.error('Error while sending welcome mail', err));
        if (alreadyInvitedUserByAdmin) {
          throw new NotAcceptableException(
            'The user is already registered. Please check your inbox for the activation link'
          );
        }
        return {};
      }
      case activeAccountButnotActiveInWorkspace:
      case activeUserWantsToSignUpToWorkspace: {
        /* User is already active in some workspace but not in this workspace */
        let organizationUser: OrganizationUser;
        if (alreadyInvitedUserByAdmin) {
          organizationUser = alreadyInvitedUserByAdmin;
        } else {
          /* Create new organizations_user entry and send an invite */
          organizationUser = await this.addUserToTheWorkspace(existingUser, signingUpOrganization, manager);
          await this.usersService.validateLicense(manager);
        }
        return this.sendOrgInvite(
          { email: existingUser.email, firstName: existingUser.firstName },
          signingUpOrganization.name,
          signingUpOrganization.id,
          organizationUser.invitationToken,
          redirectTo,
          !!alreadyInvitedUserByAdmin
        );
      }
      case hasWorkspaceInviteButUserWantsInstanceSignup: {
        const firstTimeSignup = ![SOURCE.SIGNUP, SOURCE.WORKSPACE_SIGNUP].includes(existingUser.source as SOURCE);
        if (firstTimeSignup) {
          /* Invite user doing instance signup. So reset name fields and set password */
          let defaultOrganizationId = existingUser.defaultOrganizationId;
          const isPersonalWorkspaceAllowed =
            (await this.instanceSettingsService.getSettings(INSTANCE_USER_SETTINGS.ALLOW_PERSONAL_WORKSPACE)) ===
            'true';
          if (!existingUser.defaultOrganizationId && isPersonalWorkspaceAllowed) {
            const personalWorkspaces = await this.organizationUsersService.personalWorkspaces(existingUser.id);
            if (personalWorkspaces.length) {
              defaultOrganizationId = personalWorkspaces[0].organizationId;
            } else {
              /* Create a personal workspace for the user */
              const { name, slug } = generateNextNameAndSlug('My workspace');
              const defaultOrganization = await this.organizationsService.create(name, slug, null, manager);
              defaultOrganizationId = defaultOrganization.id;
              await this.organizationUsersService.create(existingUser, defaultOrganization, true, manager);
              await this.usersService.attachUserGroup(
                ['all_users', 'admin'],
                defaultOrganizationId,
                existingUser.id,
                false,
                manager
              );
            }
          }

          await this.usersService.updateUser(
            existingUser.id,
            {
              ...(firstName && { firstName }),
              ...(lastName && { lastName }),
              password,
              source: SOURCE.SIGNUP,
              defaultOrganizationId,
            },
            manager
          );
        }
        await this.usersService.validateLicense(manager);
        this.emailService
          .sendWelcomeEmail(existingUser.email, existingUser.firstName, existingUser.invitationToken)
          .catch((err) => console.error('Error while sending welcome mail', err));
        const errorMessage = 'The user is already registered. Please check your inbox for the activation link';
        if (!firstTimeSignup) throw new NotAcceptableException(errorMessage);
        return {};
      }
      case isUserAlreadyExisted: {
        const errorMessage = organizationId ? 'User already exists in the workspace.' : 'Email already exists.';
        throw new NotAcceptableException(errorMessage);
      }
      default:
        break;
    }
  };

  async addUserToTheWorkspace(existingUser: User, signingUpOrganization: Organization, manager: EntityManager) {
    await this.usersService.attachUserGroup(['all_users'], signingUpOrganization.id, existingUser.id, false, manager);
    return this.organizationUsersService.create(
      existingUser,
      signingUpOrganization,
      true,
      manager,
      WORKSPACE_USER_SOURCE.SIGNUP
    );
  }

  async activateAccountWithToken(activateAccountWithToken: ActivateAccountWithTokenDto, response: any) {
    const { email, password, organizationToken } = activateAccountWithToken;
    const signupUser = await this.jwtService.findByEmail(email);
    const invitedUser = await this.organizationUsersService.findByWorkspaceInviteToken(organizationToken);

    /* Server level check for this API */
    if (!signupUser || invitedUser.email !== signupUser.email) {
      const { type, message, inputError } = SIGNUP_ERRORS.INCORRECT_INVITED_EMAIL;
      const errorResponse = {
        message: {
          message,
          type,
          inputError,
        },
      };
      throw new NotAcceptableException(errorResponse);
    }

    if (signupUser?.organizationUsers?.some((ou) => ou.status === WORKSPACE_USER_STATUS.ACTIVE)) {
      throw new NotAcceptableException('Email already exists');
    }

    const lifecycleParams = getUserStatusAndSource(lifecycleEvents.USER_REDEEM, SOURCE.INVITE);

    return await dbTransactionWrap(async (manager: EntityManager) => {
      // Activate default workspace if user has one
      const defaultOrganizationUser: OrganizationUser = signupUser.organizationUsers.find(
        (ou) => ou.organizationId === signupUser.defaultOrganizationId
      );
      let defaultOrganization: Organization;
      if (defaultOrganizationUser) {
        await this.organizationUsersService.activateOrganization(defaultOrganizationUser, manager);
        defaultOrganization = await this.jwtService.fetchOrganization(defaultOrganizationUser.organizationId);
      }

      await this.usersService.updateUser(
        signupUser.id,
        {
          password,
          invitationToken: null,
          ...(password ? { password } : {}),
          ...lifecycleParams,
          updatedAt: new Date(),
        },
        manager
      );

      /* 
        Generate org invite and send back to the client. Let him join to the workspace
        CASE: user redirected to signup to activate his account with password. 
        Till now user doesn't have an organization.
      */
      await this.usersService.validateLicense(manager);
      return this.processOrganizationSignup(
        response,
        signupUser,
        { invitationToken: organizationToken, organizationId: invitedUser['invitedOrganizationId'] },
        manager,
        defaultOrganization
      );
    });
  }

  async forgotPassword(email: string) {
    const user = await this.jwtService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Email address not found');
    }
    const forgotPasswordToken = uuid.v4();
    await this.usersService.updateUser(user.id, { forgotPasswordToken });
    this.emailService
      .sendPasswordResetEmail(email, forgotPasswordToken, user.firstName)
      .catch((err) => console.error('Error while sending password reset mail', err));
  }

  async resetPassword(token: string, password: string) {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new NotFoundException(
        'Invalid Reset Password URL. Please ensure you have the correct URL for resetting your password.'
      );
    } else {
      await this.usersService.updateUser(user.id, {
        password,
        forgotPasswordToken: null,
        passwordRetryCount: 0,
      });
    }
  }

  private splitName(name: string): { firstName: string; lastName: string } {
    const nameObj = { firstName: '', lastName: '' };
    if (name) {
      const [firstName, ...rest] = name.split(' ');
      nameObj.firstName = firstName;
      if (rest.length != 0) {
        nameObj.lastName = rest.join(' ');
      }
    }
    return nameObj;
  }

  async setupAdmin(response: Response, userCreateDto: CreateAdminDto): Promise<any> {
    const { companyName, companySize, name, role, workspace, password, email, phoneNumber } = userCreateDto;

    const nameObj = this.splitName(name);

    const result = await dbTransactionWrap(async (manager: EntityManager) => {
      // Create first organization
      const organization = await this.organizationsService.create(
        workspace || 'My workspace',
        'my-workspace',
        null,
        manager
      );
      const user = await this.usersService.create(
        {
          email,
          password,
          ...(nameObj.firstName && { firstName: nameObj.firstName }),
          ...(nameObj.lastName && { lastName: nameObj.lastName }),
          ...getUserStatusAndSource(lifecycleEvents.USER_ADMIN_SETUP),
          companyName,
          companySize,
          role,
          phoneNumber,
        },
        organization.id,
        USER_ROLE.ADMIN,
        null,
        false,
        null,
        manager
      );
      await this.organizationUsersService.create(user, organization, false, manager);
      return this.generateLoginResultPayload(response, user, organization, false, true, null, manager);
    });

    await this.metadataService.finishOnboarding(new TelemetryDataDto(userCreateDto));
    return result;
  }

  async setupAccountFromInvitationToken(response: Response, userCreateDto: CreateUserDto) {
    const {
      companyName,
      companySize,
      token,
      role,
      organizationToken,
      password: userPassword,
      source,
      phoneNumber,
    } = userCreateDto;
    let password = userPassword;

    if (!token) {
      throw new BadRequestException('Invalid token');
    }

    return await dbTransactionWrap(async (manager: EntityManager) => {
      const user: User = await manager.findOne(User, { where: { invitationToken: token } });
      let organizationUser: OrganizationUser;
      let isSSOVerify: boolean;

      const allowPersonalWorkspace =
        (await this.usersService.count()) === 0 ||
        (await this.instanceSettingsService.getSettings(INSTANCE_USER_SETTINGS.ALLOW_PERSONAL_WORKSPACE)) === 'true';

      if (!(allowPersonalWorkspace || organizationToken)) {
        throw new BadRequestException('Invalid invitation link');
      }
      if (organizationToken) {
        organizationUser = await manager.findOne(OrganizationUser, {
          where: { invitationToken: organizationToken },
          relations: ['user'],
        });
      }

      if (!password && source === URL_SSO_SOURCE) {
        /* For SSO we don't need password. let us set uuid as a password. */
        password = uuid4();
      }

      if (user?.organizationUsers) {
        if (!password && source === 'sso') {
          /* For SSO we don't need password. let us set uuid as a password. */
          password = uuid.v4();
        }

        if (isPasswordMandatory(user.source) && !password) {
          throw new BadRequestException('Please enter password');
        }

        if (allowPersonalWorkspace) {
          // Getting default workspace
          const defaultOrganizationUser: OrganizationUser = user.organizationUsers.find(
            (ou) => ou.organizationId === user.defaultOrganizationId
          );

          if (!defaultOrganizationUser) {
            throw new BadRequestException('Invalid invitation link');
          }

          // Activate default workspace
          await this.organizationUsersService.activateOrganization(defaultOrganizationUser, manager);
        }

        isSSOVerify =
          source === URL_SSO_SOURCE &&
          (user.source === SOURCE.GOOGLE ||
            user.source === SOURCE.GIT ||
            user.source === SOURCE.OPENID ||
            user.source === SOURCE.SAML ||
            user.source === SOURCE.LDAP);

        const lifecycleParams = getUserStatusAndSource(
          isSSOVerify ? lifecycleEvents.USER_SSO_ACTIVATE : lifecycleEvents.USER_REDEEM,
          organizationUser ? SOURCE.INVITE : SOURCE.SIGNUP
        );

        await this.usersService.updateUser(
          user.id,
          {
            ...(role ? { role } : {}),
            companySize,
            companyName,
            phoneNumber,
            invitationToken: null,
            ...(isPasswordMandatory(user.source) ? { password } : {}),
            ...lifecycleParams,
            updatedAt: new Date(),
          },
          manager
        );
      } else {
        throw new BadRequestException('Invalid invitation link');
      }

      if (organizationUser) {
        // Activate invited workspace
        await this.organizationUsersService.activateOrganization(organizationUser, manager);

        // Setting this workspace as default one to load it
        await this.usersService.updateUser(
          organizationUser.user.id,
          { defaultOrganizationId: organizationUser.organizationId },
          manager
        );
      }

      const organization = await manager.findOne(Organization, {
        where: {
          id: organizationUser?.organizationId || user.defaultOrganizationId,
        },
      });

      const isInstanceSSOLogin = !organizationUser && isSSOVerify;

      await this.auditLoggerService.perform(
        {
          userId: user.id,
          organizationId: organization.id,
          resourceId: user.id,
          resourceName: user.email,
          resourceType: ResourceTypes.USER,
          actionType: ActionTypes.USER_INVITE_REDEEM,
        },
        manager
      );

      await this.usersService.validateLicense(manager);
      return this.generateLoginResultPayload(response, user, organization, isInstanceSSOLogin, !isSSOVerify);
    });
  }

  async acceptOrganizationInvite(response: Response, loggedInUser: User, acceptInviteDto: AcceptInviteDto) {
    const { token } = acceptInviteDto;

    return await dbTransactionWrap(async (manager: EntityManager) => {
      const organizationUser = await manager.findOne(OrganizationUser, {
        where: { invitationToken: token },
        relations: ['user', 'organization'],
      });

      if (!organizationUser?.user) {
        throw new BadRequestException('Invalid invitation link');
      }
      const user: User = organizationUser.user;

      if (user.invitationToken) {
        // User sign up link send - not activated account
        this.emailService
          .sendWelcomeEmail(
            user.email,
            `${user.firstName} ${user.lastName} ?? ''`,
            user.invitationToken,
            `${organizationUser.invitationToken}`,
            organizationUser.organizationId
          )
          .catch((err) => console.error('Error while sending welcome mail', err));
        throw new UnauthorizedException(
          'Please setup your account using account setup link shared via email before accepting the invite'
        );
      }
      await this.usersService.updateUser(user.id, { defaultOrganizationId: organizationUser.organizationId }, manager);
      const organization = await this.organizationsService.get(organizationUser.organizationId);
      const activeWorkspacesCount = await this.organizationUsersService.getActiveWorkspacesCount(user.id);
      await this.organizationUsersService.activateOrganization(organizationUser, manager);
      const personalWorkspacesCount = await this.organizationUsersService.personalWorkspaceCount(user.id);
      if (personalWorkspacesCount === 1 && activeWorkspacesCount === 0) {
        /* User already signed up thorugh instance signup page. but now needs to signup through workspace signup page */
        /* Activate the personal workspace */
        const organizationUser = await manager.findOne(OrganizationUser, {
          where: { organizationId: user.defaultOrganizationId },
          relations: ['user', 'organization'],
        });
        await this.organizationUsersService.activateOrganization(organizationUser, manager);
      }
      const isWorkspaceSignup = organizationUser.source === WORKSPACE_USER_SOURCE.SIGNUP;
      await this.usersService.validateLicense(manager);
      return this.generateLoginResultPayload(
        response,
        user,
        organization,
        null,
        isWorkspaceSignup,
        loggedInUser,
        manager
      );
    });
  }

  async getInviteeDetails(token: string) {
    const organizationUser: OrganizationUser = await this.organizationUsersRepository.findOneOrFail({
      where: { invitationToken: token },
      select: ['id', 'user'],
      relations: ['user'],
    });
    return { email: organizationUser.user.email };
  }

  async verifyInviteToken(token: string, organizationToken?: string) {
    const user: User = await this.usersRepository.findOne({ where: { invitationToken: token } });
    let organizationUser: OrganizationUser;

    if (organizationToken) {
      organizationUser = await this.organizationUsersRepository.findOne({
        where: { invitationToken: organizationToken },
        relations: ['user'],
      });

      if (!user && organizationUser) {
        return {
          redirect_url: generateOrgInviteURL(organizationToken, organizationUser.organizationId),
        };
      } else if (user && !organizationUser) {
        return {
          redirect_url: generateInviteURL(token),
        };
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid token');
    }

    if (user.status === USER_STATUS.ARCHIVED) {
      throw new BadRequestException(getUserErrorMessages(user.status));
    }

    await this.usersService.updateUser(user.id, getUserStatusAndSource(lifecycleEvents.USER_VERIFY, user.source));

    return {
      email: user.email,
      name: `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`,
      onboarding_details: {
        password: isPasswordMandatory(user.source), // Should accept password if user is setting up first time
        questions:
          (this.configService.get<string>('ENABLE_ONBOARDING_QUESTIONS_FOR_ALL_SIGN_UPS') === 'true' &&
            !organizationUser) || // Should ask onboarding questions if first user of the instance. If ENABLE_ONBOARDING_QUESTIONS_FOR_ALL_SIGN_UPS=true, then will ask questions to all signup users
          (await this.usersService.count({ status: USER_STATUS.ACTIVE })) === 0,
      },
    };
  }

  async verifyOrganizationToken(token: string) {
    const organizationUser: OrganizationUser = await this.organizationUsersRepository.findOne({
      where: { invitationToken: token },
      relations: ['user'],
    });

    const user: User = organizationUser?.user;
    if (!user) {
      throw new BadRequestException('Invalid token');
    }
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new BadRequestException(getUserErrorMessages(user.status));
    }

    await this.auditLoggerService.perform({
      userId: user.id,
      organizationId: organizationUser.organizationId,
      resourceId: user.id,
      resourceName: user.email,
      resourceType: ResourceTypes.USER,
      actionType: ActionTypes.USER_INVITE_REDEEM,
    });

    return {
      email: user.email,
      name: `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`,
      onboarding_details: {
        password: false, // Should not accept password for organization token
      },
    };
  }

  async generateSessionPayload(user: User, currentOrganization: Organization, appData?: any) {
    return dbTransactionWrap(async (manager: EntityManager) => {
      const currentOrganizationId = currentOrganization?.id
        ? currentOrganization?.id
        : user?.organizationIds?.includes(user?.defaultOrganizationId)
        ? user.defaultOrganizationId
        : user?.organizationIds?.[0];
      const organizationDetails = currentOrganizationId
        ? currentOrganization
          ? currentOrganization
          : await manager.findOneOrFail(Organization, {
              where: { id: currentOrganizationId },
              select: ['slug', 'name', 'id'],
            })
        : null;

      const activeWorkspacesCount = await this.organizationUsersService.getActiveWorkspacesCount(user.id);
      const noWorkspaceAttachedInTheSession = activeWorkspacesCount === 0;
      const isAllWorkspacesArchived = await this.organizationUsersService.isAllWorkspacesArchivedBySuperAdmin(user.id);

      return decamelizeKeys({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        noWorkspaceAttachedInTheSession,
        isAllWorkspacesArchived,
        currentOrganizationId,
        currentOrganizationSlug: organizationDetails?.slug,
        currentOrganizationName: organizationDetails?.name,
        ...(appData && { appData }),
      });
    });
  }

  async generateLoginResultPayload(
    response: Response,
    user: User,
    organization: DeepPartial<Organization>,
    isInstanceSSO: boolean,
    isPasswordLogin: boolean,
    loggedInUser?: User,
    manager?: EntityManager,
    invitedOrganizationId?: string
  ): Promise<any> {
    const request = RequestContext?.currentContext?.req;
    const organizationIds = new Set([
      ...(loggedInUser?.id === user.id ? loggedInUser?.organizationIds || [] : []),
      ...(organization ? [organization.id] : []),
    ]);
    let sessionId = loggedInUser?.sessionId;

    // logged in user and new user are different -> creating session
    if (loggedInUser?.id !== user.id) {
      const clientIp = (request as any)?.clientIp;
      const session: UserSessions = await this.sessionService.createSession(
        user.id,
        `IP: ${clientIp || (request && requestIp.getClientIp(request)) || 'unknown'} UA: ${
          request?.headers['user-agent'] || 'unknown'
        }`,
        manager
      );
      sessionId = session.id;
    }

    const JWTPayload: JWTPayload = {
      sessionId: sessionId,
      username: user.id,
      sub: user.email,
      organizationIds: [...organizationIds],
      isSSOLogin: loggedInUser?.isSSOLogin || isInstanceSSO,
      isPasswordLogin: loggedInUser?.isPasswordLogin || isPasswordLogin,
      ...(invitedOrganizationId ? { invitedOrganizationId } : {}),
    };

    if (organization) user.organizationId = organization.id;

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 2 * 365 * 24 * 60 * 60 * 1000, // maximum expiry 2 years
    };

    if (this.configService.get<string>('ENABLE_PRIVATE_APP_EMBED') === 'true') {
      // disable cookie security
      cookieOptions.sameSite = 'none';
      cookieOptions.secure = true;
    }

    response.cookie('tj_auth_token', this.jwtService.generateToken(JWTPayload), cookieOptions);

    const isCurrentOrganizationArchived = organization?.status === WORKSPACE_STATUS.ARCHIVE;
    const responsePayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar_id: user.avatarId,
      sso_user_info: user.userDetails?.ssoUserInfo,
      organizationId: organization?.id,
      organization: organization?.name,
      superAdmin: isSuperAdmin(user),
      admin: await this.usersService.hasGroup(user, 'admin', null, manager),
      groupPermissions: await this.usersService.groupPermissions(user, manager),
      appGroupPermissions: await this.usersService.appGroupPermissions(user, null, manager),
      dataSourceGroupPermissions: await this.usersService.dataSourceGroupPermissions(user, null, manager),
      isCurrentOrganizationArchived,
      ...(organization
        ? { currentOrganizationId: organization.id, currentOrganizationSlug: organization.slug }
        : { noWorkspaceAttachedInTheSession: true }),
    };

    return decamelizeKeys(responsePayload);
  }

  async validateInvitedUserSession(user: User, invitedUser: any, tokens: any) {
    const { accountToken, organizationToken } = tokens;
    const {
      email,
      firstName,
      lastName,
      status: invitedUserStatus,
      organizationStatus,
      organizationUserSource,
      invitedOrganizationId,
      source,
    } = invitedUser;
    const organizationAndAccountInvite = !!organizationToken && !!accountToken;
    const accountYetToActive =
      organizationAndAccountInvite &&
      [USER_STATUS.INVITED, USER_STATUS.VERIFIED].includes(invitedUserStatus as USER_STATUS);
    const invitedOrganization = await this.jwtService.fetchOrganization(invitedUser['invitedOrganizationId']);
    const { name: invitedOrganizationName, slug: invitedOrganizationSlug } = invitedOrganization;

    if (accountYetToActive) {
      /* User has invite url which got after the workspace signup */
      const isInstanceSignupInvite = !!accountToken && !organizationToken && source === SOURCE.SIGNUP;
      const isOrganizationSignupInvite = organizationAndAccountInvite && source === SOURCE.WORKSPACE_SIGNUP;
      if (isInstanceSignupInvite || isOrganizationSignupInvite) {
        const responseObj = {
          email,
          name: fullName(firstName, lastName),
          invitedOrganizationName,
          isWorkspaceSignUpInvite: true,
          source,
        };
        return decamelizeKeys(responseObj);
      }

      const errorResponse = {
        message: {
          error: 'Account is not activated yet',
          isAccountNotActivated: true,
          inviteeEmail: invitedUser.email,
          redirectPath: `/signup/${invitedOrganizationSlug ?? invitedOrganizationId}`,
        },
      };
      throw new NotAcceptableException(errorResponse);
    }

    const isWorkspaceSignup =
      organizationStatus === WORKSPACE_USER_STATUS.INVITED &&
      !!organizationToken &&
      invitedUserStatus === USER_STATUS.ACTIVE &&
      organizationUserSource === WORKSPACE_USER_SOURCE.SIGNUP;
    if (isWorkspaceSignup) {
      /* Active user & Organization invite */
      const responseObj = {
        organizationUserSource,
      };
      return decamelizeKeys(responseObj);
    }
    /* Send back the organization invite url if the user has old workspace + account invitation URL */
    const doesUserHaveWorkspaceAndAccountInvite =
      organizationAndAccountInvite &&
      [USER_STATUS.ACTIVE].includes(invitedUserStatus as USER_STATUS) &&
      organizationStatus === WORKSPACE_USER_STATUS.INVITED;
    const organizationInviteUrl = doesUserHaveWorkspaceAndAccountInvite
      ? generateOrgInviteURL(organizationToken, invitedOrganizationId, false)
      : null;

    const organzationId = user?.organizationId || user?.defaultOrganizationId;
    const activeOrganization = organzationId ? await this.jwtService.fetchOrganization(organzationId) : null;
    const payload = await this.generateSessionPayload(user, activeOrganization);
    const responseObj = {
      ...payload,
      invitedOrganizationName,
      name: fullName(user['firstName'], user['lastName']),
      ...(organizationInviteUrl && { organizationInviteUrl }),
    };
    return decamelizeKeys(responseObj);
  }

  async generateInviteSignupPayload(
    response: Response,
    user: User,
    source: string,
    manager?: EntityManager
  ): Promise<any> {
    const request = RequestContext?.currentContext?.req;
    const clientIp = (request as any)?.clientIp;
    const { id, email, firstName, lastName } = user;

    const session: UserSessions = await this.sessionService.createSession(
      user.id,
      `IP: ${clientIp || requestIp.getClientIp(request) || 'unknown'} UA: ${
        request?.headers['user-agent'] || 'unknown'
      }`,
      manager
    );
    const sessionId = session.id;

    const JWTPayload: JWTPayload = {
      sessionId,
      username: id,
      sub: email,
      organizationIds: [],
      isSSOLogin: source === 'sso',
      isPasswordLogin: source === 'signup',
    };

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 2 * 365 * 24 * 60 * 60 * 1000, // maximum expiry 2 years
    };

    if (this.configService.get<string>('ENABLE_PRIVATE_APP_EMBED') === 'true') {
      // disable cookie security
      cookieOptions.sameSite = 'none';
      cookieOptions.secure = true;
    }
    response.cookie('tj_auth_token', this.jwtService.generateToken(JWTPayload), cookieOptions);

    return decamelizeKeys({
      id,
      email,
      firstName,
      lastName,
    });
  }

  async retrieveAppDataUsingSlug(
    slug: string
  ): Promise<{ organizationId: string; isPublic: boolean; isReleased: boolean }> {
    return await dbTransactionWrap(async (manager: EntityManager) => {
      let app: App;
      try {
        app = await manager.findOneOrFail(App, slug);
      } catch (error) {
        app = await manager.findOne(App, {
          slug,
        });
      }

      return {
        organizationId: app?.organizationId,
        isPublic: app?.isPublic,
        isReleased: app?.currentVersionId ? true : false,
      };
    });
  }
}

interface JWTPayload {
  sessionId: string;
  username: string;
  sub: string;
  organizationIds: Array<string>;
  isSSOLogin: boolean;
  isPasswordLogin: boolean;
  invitedOrganizationId?: string;
}
