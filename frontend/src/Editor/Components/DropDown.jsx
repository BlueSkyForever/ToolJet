import { resolveReferences } from '@/_helpers/utils';
import { useCurrentState } from '@/_stores/currentStateStore';
import React, { useState, useEffect, useMemo } from 'react';
import Select, { components } from 'react-select';
import * as Icons from '@tabler/icons-react';
import CheckMark from '@/_ui/Icon/solidIcons/CheckMark';
import { CustomMenuList } from './Table/SelectComponent';
import { Spinner } from 'react-bootstrap';

const { ValueContainer, SingleValue, Placeholder } = components;

const CustomValueContainer = ({ children, ...props }) => {
  const selectProps = props.selectProps;
  // eslint-disable-next-line import/namespace
  const IconElement = Icons[selectProps?.icon] == undefined ? Icons['IconHome2'] : Icons[selectProps?.icon];
  return (
    <ValueContainer {...props}>
      {selectProps?.doShowIcon && (
        <IconElement
          style={{
            width: '16px',
            height: '16px',
            color: selectProps?.iconColor,
          }}
        />
      )}
      <span className="d-flex" {...props}>
        {React.Children.map(children, (child) => {
          return child ? (
            child
          ) : props.hasValue ? (
            <SingleValue {...props} {...selectProps}>
              {selectProps?.getOptionLabel(props?.getValue()[0])}
            </SingleValue>
          ) : (
            <Placeholder {...props} key="placeholder" {...selectProps} data={props.getValue()}>
              {selectProps.placeholder}
            </Placeholder>
          );
        })}
      </span>
    </ValueContainer>
  );
};

const Option = (props) => {
  // Hack around https://github.com/JedWatson/react-select/pull/3705
  const firstOption = props.options[0];
  const isFirstOption = props.label === firstOption.label;
  return (
    <components.Option {...props}>
      <div className="d-flex justify-content-between">
        <span style={{ color: props.isDisabled ? '#889096' : 'unset' }}>{props.label}</span>
        {props.isSelected && (
          <span style={{ maxHeight: '20px' }}>
            <CheckMark
              width={'20'}
              fill={isFirstOption && props.isFocused ? '#3E63DD' : props.isFocused ? '#FFFFFF' : '#3E63DD'}
            />
          </span>
        )}
      </div>
    </components.Option>
  );
};

export const DropDown = function DropDown({
  height,
  validate,
  properties,
  styles,
  setExposedVariable,
  fireEvent,
  darkMode,
  onComponentClick,
  id,
  component,
  exposedVariables,
  dataCy,
  adjustHeightBasedOnAlignment,
}) {
  let {
    label,
    value,
    advanced,
    schema,
    placeholder,
    display_values,
    values,
    dropdownLoadingState,
    disabledState,
    optionVisibility,
    optionDisable,
  } = properties;
  const {
    selectedTextColor,
    fieldBorderRadius,
    justifyContent,
    boxShadow,
    labelColor,
    alignment,
    direction,
    fieldBorderColor,
    fieldBackgroundColor,
    labelWidth,
    icon,
    iconVisibility,
    errTextColor,
    labelAutoWidth,
    iconColor,
    padding,
  } = styles;
  const [currentValue, setCurrentValue] = useState(() => (advanced ? findDefaultItem(schema) : value));
  const { value: exposedValue } = exposedVariables;
  const currentState = useCurrentState();
  const isMandatory = resolveReferences(component?.definition?.validation?.mandatory?.value, currentState);
  const validationData = validate(currentValue);
  const { isValid, validationError } = validationData;
  const ref = React.useRef(null);
  const selectref = React.useRef(null);
  const [visibility, setVisibility] = useState(properties.visibility);
  const [isDropdownLoading, setIsDropdownLoading] = useState(dropdownLoadingState);
  const [isDropdownDisabled, setIsDropdownDisabled] = useState(disabledState);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const _height = padding === 'default' ? 32 : height;
  useEffect(() => {
    if (visibility !== properties.visibility) setVisibility(properties.visibility);
    if (isDropdownLoading !== dropdownLoadingState) setIsDropdownLoading(dropdownLoadingState);
    if (isDropdownDisabled !== disabledState) setIsDropdownDisabled(disabledState);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.visibility, dropdownLoadingState, disabledState]);

  function findDefaultItem(schema) {
    const foundItem = schema?.find((item) => item?.default === true);
    return !hasVisibleFalse(foundItem?.value) ? foundItem?.value : undefined;
  }

  const selectOptions = useMemo(() => {
    let _selectOptions = advanced
      ? [
          ...schema
            .filter((data) => data.visible)
            .map((value) => ({
              ...value,
              isDisabled: value.disable,
            })),
        ]
      : [
          ...values
            .map((value, index) => {
              if (optionVisibility[index]) {
                return { label: display_values[index], value: value, isDisabled: optionDisable[index] };
              }
            })
            .filter((option) => option),
        ];

    return _selectOptions;
  }, [advanced, schema, display_values, values, optionDisable, optionVisibility]);

  const setExposedItem = (value, index, onSelectFired = false) => {
    setCurrentValue(value);
    onSelectFired ? setExposedVariable('value', value).then(fireEvent('onSelect')) : setExposedVariable('value', value);
    setExposedVariable('selectedOptionLabel', index === undefined ? undefined : display_values?.[index]);
  };

  function selectOption(value) {
    let index = null;
    index = values?.indexOf(value);

    if (values?.includes(value)) {
      setExposedItem(value, index, true);
    } else {
      setExposedItem(undefined, undefined, true);
    }
  }

  useEffect(() => {
    setExposedVariable('selectOption', async function (value) {
      selectOption(value);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), setCurrentValue, JSON.stringify(display_values)]);

  useEffect(() => {
    setExposedVariable('isValid', isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  useEffect(() => {
    let newValue = undefined;
    let index = null;
    if (values?.includes(value)) {
      newValue = value;
      index = values?.indexOf(value);
    }
    setExposedItem(newValue, index);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, JSON.stringify(values)]);

  useEffect(() => {
    let index = null;
    if (exposedValue !== currentValue) {
      setExposedVariable('value', currentValue);
    }
    index = values?.indexOf(currentValue);
    setExposedVariable('selectedOptionLabel', display_values?.[index]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, JSON.stringify(display_values), JSON.stringify(values)]);

  useEffect(() => {
    let newValue = undefined;
    let index = null;

    if (values?.includes(currentValue)) newValue = currentValue;
    else if (values?.includes(value)) newValue = value;
    index = values?.indexOf(newValue);
    setExposedItem(newValue, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  useEffect(() => {
    setExposedVariable('label', label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  useEffect(() => {
    if (advanced) {
      setExposedVariable(
        'optionLabels',
        schema?.filter((item) => item?.visible)?.map((item) => item.label)
      );
      if (hasVisibleFalse(currentValue)) {
        setCurrentValue(findDefaultItem(schema));
      }
    } else setExposedVariable('optionLabels', display_values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(schema), advanced, JSON.stringify(display_values), currentValue]);

  useEffect(() => {
    setExposedVariable('isVisible', properties.visibility);
    setExposedVariable('isLoading', dropdownLoadingState);
    setExposedVariable('isDisabled', disabledState);
    setExposedVariable('isMandatory', isMandatory);

    setExposedVariable('clear', async function () {
      setCurrentValue(null);
    });
    setExposedVariable('setVisibility', async function (value) {
      setVisibility(value);
    });
    setExposedVariable('setLoading', async function (value) {
      setIsDropdownLoading(value);
    });
    setExposedVariable('setDisabled', async function (value) {
      setIsDropdownDisabled(value);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.visibility, dropdownLoadingState, disabledState, isMandatory]);

  useEffect(() => {
    if (alignment == 'top' && label) adjustHeightBasedOnAlignment(true);
    else adjustHeightBasedOnAlignment(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignment, label]);

  function hasVisibleFalse(value) {
    for (let i = 0; i < schema?.length; i++) {
      if (schema[i].value === value && schema[i].visible === false) {
        return true;
      }
    }
    return false;
  }

  const onSearchTextChange = (searchText, actionProps) => {
    if (actionProps.action === 'input-change') {
      setInputValue(searchText);
      setExposedVariable('searchText', searchText);
      fireEvent('onSearchTextChanged');
    }
  };

  const customStyles = {
    control: (provided, state) => {
      return {
        ...provided,
        minHeight: _height,
        height: _height,
        boxShadow: state.isFocused ? boxShadow : boxShadow,
        borderRadius: Number.parseFloat(fieldBorderRadius),
        borderColor: !isValid
          ? 'var(--tj-text-input-widget-error)'
          : state.isFocused
          ? '#3E63DD'
          : ['#D7DBDF'].includes(fieldBorderColor)
          ? darkMode
            ? '#4C5155'
            : '#D7DBDF'
          : fieldBorderColor,
        backgroundColor:
          darkMode && ['#fff'].includes(fieldBackgroundColor)
            ? '#313538'
            : state.isDisabled
            ? '#F1F3F5'
            : fieldBackgroundColor,
        '&:hover': {
          backgroundColor: 'var(--tj-text-input-widget-hover) !important',
          borderColor: '#3E63DD',
        },
      };
    },
    valueContainer: (provided, _state) => ({
      ...provided,
      height: _height,
      padding: '0 6px',
      justifyContent,
      display: 'flex',
      gap: '0.13rem',
    }),

    singleValue: (provided, _state) => ({
      ...provided,
      color: darkMode && selectedTextColor === '#11181C' ? '#ECEDEE' : selectedTextColor,
    }),

    input: (provided, _state) => ({
      ...provided,
      color: darkMode ? 'white' : 'black',
      margin: '0px',
    }),
    indicatorSeparator: (_state) => ({
      display: 'none',
    }),
    indicatorsContainer: (provided, _state) => ({
      ...provided,
      height: _height,
    }),
    clearIndicator: (provided, _state) => ({
      ...provided,
      padding: '0px',
    }),
    dropdownIndicator: (provided, _state) => ({
      ...provided,
      padding: '0px',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: darkMode && ['#fff'].includes(fieldBackgroundColor) ? '#313538' : fieldBackgroundColor,
      color: darkMode && ['#11181C'].includes(selectedTextColor) ? '#ECEDEE' : selectedTextColor,
      '&:hover': {
        backgroundColor: '#ACB2B9',
        color: 'white',
      },
    }),
    menuList: (provided, state) => ({
      ...provided,
      padding: '2px',
      // this is needed otherwise :active state doesn't look nice, gap is required
      display: 'flex',
      flexDirection: 'column',
      gap: '4px !important',
      overflowY: 'auto',
    }),
    menu: (provided, state) => ({
      ...provided,
      marginTop: '5px',
      backgroundColor: darkMode && ['#fff'].includes(fieldBackgroundColor) ? '#313538' : fieldBackgroundColor,
    }),
  };

  const handleOutsideClick = (e) => {
    let menu = ref.current.querySelector('.select__menu');
    if (!ref.current.contains(e.target) || !menu || !menu.contains(e.target)) {
      setIsFocused(false);
      setInputValue('');
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const labelStyles = {
    [alignment === 'side' && direction === 'alignRight' ? 'marginLeft' : 'marginRight']: label ? '1rem' : '0.001rem',
    color: darkMode && labelColor === '#11181C' ? '#ECEDEE' : labelColor,
    alignSelf: direction === 'alignRight' ? 'flex-end' : 'flex-start',
  };

  if (isDropdownLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ width: '100%', height }}>
        <center>
          <div className="spinner-border" role="status"></div>
        </center>
      </div>
    );
  }
  return (
    <>
      <div
        className="dropdown-widget g-0"
        style={{
          height,
          display: visibility ? 'flex' : 'none',
          flexDirection: alignment === 'top' ? 'column' : direction === 'alignRight' ? 'row-reverse' : 'row',
          padding: padding === 'default' ? '3px 2px' : '',
        }}
        onMouseDown={(event) => {
          onComponentClick(id, component, event);
        }}
        data-cy={dataCy}
      >
        <div
          className="my-auto"
          style={{
            alignSelf: direction === 'alignRight' ? 'flex-end' : 'flex-start',
            width: alignment === 'top' || labelAutoWidth ? 'auto' : `${labelWidth}%`,
            maxWidth: alignment === 'top' || labelAutoWidth ? '100%' : `${labelWidth}%`,
          }}
        >
          <label style={labelStyles} className="font-size-12 font-weight-500 py-0 my-0">
            {label}
            <span style={{ color: '#DB4324', marginLeft: '1px' }}>{isMandatory && '*'}</span>
          </label>
        </div>
        <div className="w-100 px-0 h-100" ref={ref}>
          <Select
            ref={selectref}
            isDisabled={isDropdownDisabled}
            value={selectOptions.filter((option) => option.value === currentValue)[0] ?? null}
            onChange={(selectedOption, actionProps) => {
              if (actionProps.action === 'clear') {
                setCurrentValue(null);
              }
              if (actionProps.action === 'select-option') {
                setCurrentValue(selectedOption.value);
                setExposedVariable('value', selectedOption.value);
                fireEvent('onSelect');
                setExposedVariable('selectedOptionLabel', selectedOption.label);
              }
              setIsFocused(false);
            }}
            options={selectOptions}
            styles={customStyles}
            // Only show loading when dynamic options are enabled
            isLoading={advanced && properties.loadingState}
            onInputChange={onSearchTextChange}
            onFocus={(event) => {
              fireEvent('onFocus');
            }}
            onMenuInputFocus={() => setIsFocused(true)}
            onBlur={() => {
              fireEvent('onBlur');
            }}
            menuPortalTarget={document.body}
            placeholder={placeholder}
            components={{
              MenuList: CustomMenuList,
              ValueContainer: CustomValueContainer,
              Option,
              LoadingIndicator: () => <Spinner style={{ width: '16px', height: '16px', color: 'var(--indigo9)' }} />,
            }}
            isClearable
            icon={icon}
            doShowIcon={iconVisibility}
            iconColor={iconColor}
            isSearchable={false}
            isDarkMode={darkMode}
            {...{
              menuIsOpen: isFocused || undefined,
              isFocused: isFocused || undefined,
            }}
            inputValue={inputValue}
          />
        </div>
      </div>
      <div
        className={`invalid-feedback ${isValid ? '' : visibility ? 'd-flex' : 'none'}`}
        style={{
          color: errTextColor,
          justifyContent: direction === 'alignRight' ? 'flex-start' : 'flex-end',
          marginTop: alignment === 'top' ? '1.25rem' : '0.25rem',
        }}
      >
        {!isValid && validationError}
      </div>
    </>
  );
};
