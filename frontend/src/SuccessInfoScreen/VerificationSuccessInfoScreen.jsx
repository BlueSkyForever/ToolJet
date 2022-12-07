import React, { useState, useEffect } from 'react';
import EnterIcon from '../../assets/images/onboardingassets/Icons/Enter';
import GoogleSSOLoginButton from '@ee/components/LoginPage/GoogleSSOLoginButton';
import GitSSOLoginButton from '@ee/components/LoginPage/GitSSOLoginButton';
import OnBoardingForm from '../OnBoardingForm/OnBoardingForm';
import OnBoardingFormCe from '../OnBoardingForm/OnbboardingFromCe';
import { authenticationService } from '@/_services';
import { useLocation, useHistory } from 'react-router-dom';
import { LinkExpiredInfoScreen } from '@/SuccessInfoScreen';
import { ShowLoading } from '@/_components';
import { toast } from 'react-hot-toast';
import OnboardingNavbar from '@/_components/OnboardingNavbar';
import { ButtonSolid } from '@/_components/AppButton';
import OnboardingCta from '@/_components/OnboardingCta';
import EyeHide from '../../assets/images/onboardingassets/Icons/EyeHide';
import EyeShow from '../../assets/images/onboardingassets/Icons/EyeShow';
import Spinner from '@/_ui/Spinner';
import { useTranslation } from 'react-i18next';
import { buildURLWithQuery } from '@/_helpers/utils';

export const VerificationSuccessInfoScreen = function VerificationSuccessInfoScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState(false);
  const [userDetails, setUserDetails] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinWorkspace, setShowJoinWorkspace] = useState(false);
  const [isGettingConfigs, setIsGettingConfigs] = useState(true);
  const [configs, setConfigs] = useState({});
  const [password, setPassword] = useState();
  const [showPassword, setShowPassword] = useState(false);
  const [fallBack, setFallBack] = useState(false);
  const { t } = useTranslation();

  const location = useLocation();
  const history = useHistory();

  const organizationId = new URLSearchParams(location?.state?.search).get('oid');
  const single_organization = window.public_config?.DISABLE_MULTI_WORKSPACE === 'true';
  const source = new URLSearchParams(location?.state?.search).get('source');
  const darkMode = localStorage.getItem('darkMode') === 'true';

  const getUserDetails = () => {
    setIsLoading(true);
    authenticationService
      .verifyToken(location?.state?.token, location?.state?.organizationToken)
      .then((data) => {
        if (data?.redirect_url) {
          window.location.href = buildURLWithQuery(data.redirect_url, {
            ...(organizationId ? { oid: organizationId } : {}),
            ...(source ? { source } : {}),
          });
          return;
        }
        setUserDetails(data);
        setIsLoading(false);
        if (data?.email !== '') {
          if (location?.state?.organizationToken) {
            setShowJoinWorkspace(true);
            return;
          }
          setVerifiedToken(true);
        }
      })
      .catch(({ error }) => {
        setIsLoading(false);
        toast.error(error, { position: 'top-center' });
        setFallBack(true);
      });
  };

  useEffect(() => {
    getUserDetails();
    if (source == 'sso') setShowJoinWorkspace(true);
    authenticationService.deleteLoginOrganizationId();
    if (!single_organization) {
      if (organizationId) {
        authenticationService.saveLoginOrganizationId(organizationId);
        organizationId &&
          authenticationService.getOrganizationConfigs(organizationId).then(
            (configs) => {
              setIsGettingConfigs(false);
              setConfigs(configs);
            },
            () => {
              setIsGettingConfigs(false);
            }
          );
      } else {
        setIsGettingConfigs(false);
      }
    } else {
      authenticationService.getOrganizationConfigs().then(
        (configs) => {
          setIsGettingConfigs(false);
          setConfigs(configs);
        },
        () => {
          setIsGettingConfigs(false);
        }
      );
    }
  }, []);

  const setUpAccount = (e) => {
    e.preventDefault();
    setIsLoading(true);
    authenticationService
      .onboarding({
        companyName: '',
        companySize: '',
        role: '',
        token: location?.state?.token,
        organizationToken: location?.state?.organizationToken ?? '',
        source: source,
        password: password,
      })
      .then((user) => {
        authenticationService.updateUser(user);
        authenticationService.deleteLoginOrganizationId();
        setIsLoading(false);
        history.push('/');
      })
      .catch((res) => {
        setIsLoading(false);
        toast.error(res.error || 'Something went wrong', {
          id: 'toast-login-auth-error',
          position: 'top-center',
        });
      });
  };

  const handleOnCheck = () => {
    setShowPassword(!showPassword);
  };
  const handleChange = (event) => {
    setPassword(event.target.value);
  };

  return (
    <div>
      {showJoinWorkspace && (
        <div className="page common-auth-section-whole-wrapper">
          <div className="common-auth-section-left-wrapper">
            <OnboardingNavbar />
            <div className="common-auth-section-left-wrapper-grid">
              <div></div>

              <form action="." method="get" autoComplete="off">
                {isGettingConfigs ? (
                  <ShowLoading />
                ) : (
                  <div className="common-auth-container-wrapper">
                    <h2 className="common-auth-section-header org-invite-header">
                      Join {configs?.name ? configs?.name : 'ToolJet'}
                    </h2>

                    <div className="invite-sub-header">
                      {`You are invited to ${
                        configs?.name
                          ? `a workspace ${configs?.name}. Accept the invite to join the workspace.`
                          : 'ToolJet.'
                      }`}
                    </div>
                    {(configs?.google?.enabled || configs?.git?.enabled) && source !== 'sso' && (
                      <div className="d-flex flex-column align-items-center separator-bottom">
                        {configs?.google?.enabled && (
                          <div className="login-sso-wrapper">
                            <GoogleSSOLoginButton
                              text={t('confirmationPage.signupWithGoogle', 'Sign up with Google')}
                              configs={configs?.google?.configs}
                              configId={configs?.google?.config_id}
                            />
                          </div>
                        )}
                        {configs?.git?.enabled && (
                          <div className="login-sso-wrapper">
                            <GitSSOLoginButton
                              text={t('confirmationPage.signupWithGitHub', 'Sign up with GitHub')}
                              configs={configs?.git?.configs}
                            />
                          </div>
                        )}
                        <div className="separator-onboarding " style={{ width: '100%' }}>
                          <div className="mt-2 separator">
                            <h2>
                              <span>{t('confirmationPage.or', 'OR')}</span>
                            </h2>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="org-page-inputs-wrapper">
                      <label className="tj-text-input-label">{t('verificationSuccessPage.name', 'Name')}</label>
                      <p className="tj-text-input">{userDetails?.name}</p>
                    </div>

                    <div className="signup-inputs-wrap">
                      <label className="tj-text-input-label">
                        {t('verificationSuccessPage.workEmail', 'Work email')}
                      </label>
                      <p className="tj-text-input">{userDetails?.email}</p>
                    </div>

                    {userDetails?.onboarding_details?.password && (
                      <div className="mb-3">
                        <label className="form-label" data-cy="password-label">
                          {t('verificationSuccessPage.password', 'Password')}
                        </label>
                        <div className="org-password">
                          <input
                            onChange={handleChange}
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            className="tj-text-input"
                            placeholder="Enter password"
                            autoComplete="off"
                            data-cy="password-input"
                          />

                          <div className="org-password-hide-img" onClick={handleOnCheck}>
                            {showPassword ? (
                              <EyeHide
                                fill={
                                  darkMode
                                    ? password?.length
                                      ? '#D1D5DB'
                                      : '#656565'
                                    : password?.length
                                    ? '#384151'
                                    : '#D1D5DB'
                                }
                              />
                            ) : (
                              <EyeShow
                                fill={
                                  darkMode
                                    ? password?.length
                                      ? '#D1D5DB'
                                      : '#656565'
                                    : password?.length
                                    ? '#384151'
                                    : '#D1D5DB'
                                }
                              />
                            )}
                          </div>
                          <span className="tj-input-helper-text">
                            {t('loginSignupPage.passwordCharacter', 'Password must be at least 5 character')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <ButtonSolid
                        className="org-btn login-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          userDetails?.onboarding_details?.password && userDetails?.onboarding_details?.questions
                            ? (setShowOnboarding(true), setShowJoinWorkspace(false))
                            : setUpAccount(e);
                        }}
                        disabled={
                          isLoading ||
                          (userDetails?.onboarding_details?.password &&
                            (password?.length < 5 || password?.trim()?.length === 0 || !password))
                        }
                        data-cy="accept-invite-button"
                      >
                        {isLoading ? (
                          <div className="spinner-center">
                            <Spinner />
                          </div>
                        ) : (
                          <>
                            <span>{t('verificationSuccessPage.acceptInvite', 'Accept invite')}</span>
                            <EnterIcon className="enter-icon-onboard" />
                          </>
                        )}
                      </ButtonSolid>
                    </div>
                    <p className="verification-terms">
                      By signing up you are agreeing to the
                      <br />
                      <span>
                        <a href="https://www.tooljet.com/terms">Terms of Service </a>&
                        <a href="https://www.tooljet.com/privacy"> Privacy Policy</a>
                      </span>
                    </p>
                  </div>
                )}
              </form>
              <div></div>
            </div>
          </div>
          <div className="common-auth-section-right-wrapper">
            <OnboardingCta />
          </div>
        </div>
      )}

      {verifiedToken && !showOnboarding && !showJoinWorkspace && source !== 'sso' && (
        <div className="page common-auth-section-whole-wrapper">
          <div className="info-screen-outer-wrap">
            <div className="info-screen-wrapper">
              <div className="verification-success-card">
                <img
                  className="info-screen-email-img"
                  src={
                    darkMode
                      ? 'assets/images/onboardingassets/Illustrations/verification_successfull_dark.svg'
                      : 'assets/images/onboardingassets/Illustrations/verification_successfull.svg'
                  }
                  alt="email image"
                  loading="lazy"
                />
                <h1 className="common-auth-section-header">
                  {t('verificationSuccessPage.successfullyVerifiedEmail', 'Successfully verified email')}
                </h1>
                <p className="info-screen-description">
                  Your email has been verified successfully. Continue to set up your workspace to start using ToolJet.
                </p>
                <ButtonSolid
                  className="verification-success-info-btn "
                  variant="primary"
                  onClick={(e) => {
                    single_organization &&
                      (userDetails?.onboarding_details?.questions ? setShowOnboarding(true) : setUpAccount(e));
                    !single_organization &&
                      (userDetails?.onboarding_details?.questions && !userDetails?.onboarding_details?.password
                        ? setShowOnboarding(true)
                        : (userDetails?.onboarding_details?.password && !userDetails?.onboarding_details?.questions) ||
                          (userDetails?.onboarding_details?.password && userDetails?.onboarding_details?.questions)
                        ? setShowJoinWorkspace(true)
                        : setUpAccount(e));
                  }}
                >
                  {isLoading ? (
                    <div className="spinner-center">
                      <Spinner />
                    </div>
                  ) : (
                    <>
                      {t('verificationSuccessPage.setupTooljet', 'Set up ToolJet')}
                      <EnterIcon fill={'#fff'}></EnterIcon>
                    </>
                  )}
                </ButtonSolid>
              </div>
            </div>
          </div>
        </div>
      )}

      {verifiedToken && showOnboarding && (
        // <OnBoardingForm
        //   userDetails={userDetails}
        //   token={location?.state?.token}
        //   organizationToken={location?.state?.organizationToken ?? ''}
        //   password={password}
        //   darkMode={darkMode}
        // />
        <OnBoardingFormCe
          userDetails={userDetails}
          token={location?.state?.token}
          organizationToken={location?.state?.organizationToken ?? ''}
          password={password}
          darkMode={darkMode}
        />
      )}

      {fallBack && (
        <div className="page">
          <OnboardingNavbar />
          <div className="link-expired-info-wrapper">
            <div className="info-screen-outer-wrap">
              <LinkExpiredInfoScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
