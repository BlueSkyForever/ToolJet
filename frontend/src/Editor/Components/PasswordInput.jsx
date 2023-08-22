import React from 'react';
import config from 'config';
import { TextField } from '@mui/material';
import { localizeMessage } from '@/_helpers/localize';

export const PasswordInput = ({
  height,
  validate,
  properties,
  styles,
  setExposedVariable,
  darkMode,
  component,
  fireEvent,
  dataCy,
}) => {
  const { visibility, disabledState, borderRadius, backgroundColor, boxShadow } = styles;

  const placeholder = properties.placeholder;

  const [passwordValue, setPasswordValue] = React.useState('');
  let { isValid, validationError } = validate(passwordValue);

  React.useEffect(() => {
    setExposedVariable('isValid', isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordValue, isValid]);

  return (
    <>
      {config.UI_LIB === 'tooljet' && (
        <div>
          <input
            disabled={disabledState}
            onChange={(e) => {
              setPasswordValue(e.target.value);
              setExposedVariable('value', e.target.value).then(() => fireEvent('onChange'));
            }}
            type={'password'}
            className={`form-control ${!isValid ? 'is-invalid' : ''} validation-without-icon ${
              darkMode && 'dark-theme-placeholder'
            }`}
            placeholder={placeholder}
            value={passwordValue}
            style={{
              height,
              display: visibility ? '' : 'none',
              borderRadius: `${borderRadius}px`,
              backgroundColor,
              boxShadow,
            }}
            data-cy={dataCy}
          />
          <div
            className="invalid-feedback"
            data-cy={`${String(component.name).toLowerCase()}-invalid-feedback`}
          >
            {localizeMessage(validationError)}
          </div>
        </div>
      )}
      {config.UI_LIB === 'mui' && (
        <>
          <TextField
            disabled={disabledState}
            onChange={(e) => {
              setPasswordValue(e.target.value);
              setExposedVariable('value', e.target.value).then(() => fireEvent('onChange'));
            }}
            type="password"
            variant="outlined"
            value={passwordValue}
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                height,
                display: visibility ? '' : 'none',
                borderRadius: `${borderRadius}px`,
                backgroundColor,
                boxShadow,
              },
            }}
            error={!isValid}
            helperText={localizeMessage(validationError)}
            placeholder={placeholder}
          />
        </>
      )}
    </>
  );
};
