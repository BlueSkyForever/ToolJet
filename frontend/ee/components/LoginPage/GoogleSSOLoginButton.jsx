import React from 'react';
import GoogleLogin from 'react-google-login';
import { assetPath } from '@/_helpers/appUtils';

export default function GoogleSSOLoginButton(props) {
  return (
    <div className="mt-2" data-cy="google-sign-in-tile">
      <GoogleLogin
        clientId={props.configs?.client_id}
        buttonText="Login"
        cookiePolicy={'single_host_origin'}
        uxMode="redirect"
        redirectUri={`${window.public_config?.TOOLJET_HOST}/sso/google${props.configId ? `/${props.configId}` : ''}`}
        render={(renderProps) => (
          <div>
            <button {...renderProps} className="btn border-0 rounded-2">
              <img
                onClick={renderProps.onClick}
                disabled={renderProps.disabled}
                src={assetPath('/assets/images/sso-buttons/google.svg')}
                className="h-4"
                data-cy="google-icon"
              />
              <span className="px-1" data-cy="google-sign-in-text">
                {props.text || 'Sign in with Google'}
              </span>
            </button>
          </div>
        )}
      />
    </div>
  );
}
