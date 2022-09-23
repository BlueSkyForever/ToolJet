import React, { useEffect, useState, useRef } from 'react';

export const TextInput = function TextInput({
  height,
  validate,
  properties,
  styles,
  setExposedVariable,
  fireEvent,
  registerAction,
  component,
  darkMode,
}) {
  const textInputRef = useRef();

  const textColor = darkMode && styles.textColor === '#000' ? '#fff' : styles.textColor;

  const [disable, setDisable] = useState(styles.disabledState);
  const [value, setValue] = useState(properties.value);
  const [visibility, setVisibility] = useState(styles.visibility);
  const { isValid, validationError } = validate(value);

  useEffect(() => setDisable(styles.disabledState), [styles.disabledState]);

  useEffect(() => setVisibility(styles.visibility), [styles.visibility]);

  useEffect(() => {
    setExposedVariable('isValid', isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  useEffect(() => {
    setValue(properties.value);
    setExposedVariable('value', properties.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.value]);

  registerAction(
    'setFocus',
    async function () {
      textInputRef.current.focus();
    },
    [textInputRef.current]
  );
  registerAction(
    'setBlur',
    async function () {
      textInputRef.current.blur();
    },
    [textInputRef.current]
  );
  registerAction('setText', async function (text) {
    setValue(text);
    setExposedVariable('value', text).then(fireEvent('onChange'));
  });
  registerAction('clear', async function () {
    setValue('');
    setExposedVariable('value', '').then(fireEvent('onChange'));
  });
  registerAction('disable', async function (value) {
    setDisable(value);
  });
  registerAction('visibility', async function (value) {
    setVisibility(value);
  });

  return (
    <div data-disabled={disable} className={`text-input ${visibility || 'invisible'}`}>
      <input
        ref={textInputRef}
        onKeyUp={(e) => {
          if (e.key == 'Enter') {
            setValue(e.target.value);
            setExposedVariable('value', e.target.value).then(() => {
              fireEvent('onEnterPressed');
            });
          }
        }}
        onChange={(e) => {
          setValue(e.target.value);
          setExposedVariable('value', e.target.value);
          fireEvent('onChange');
        }}
        onBlur={(e) => {
          e.stopPropagation();
          fireEvent('onBlur');
        }}
        onFocus={(e) => {
          e.stopPropagation();
          fireEvent('onFocus');
        }}
        type="text"
        className={`form-control ${!isValid ? 'is-invalid' : ''} validation-without-icon ${
          darkMode && 'dark-theme-placeholder'
        }`}
        placeholder={properties.placeholder}
        style={{ height, borderRadius: `${styles.borderRadius}px`, color: textColor }}
        value={value}
        data-cy={`draggable-widget-${component.name}`}
      />
      <div className="invalid-feedback">{validationError}</div>
    </div>
  );
};
