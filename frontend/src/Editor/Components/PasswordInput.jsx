import React, { useEffect, useRef, useState } from "react";
import { resolveReferences } from "@/_helpers/utils";
import { useCurrentState } from "@/_stores/currentStateStore";
import { ToolTip } from "@/_components/ToolTip";
import * as Icons from "@tabler/icons-react";
import Loader from "@/ToolJetUI/Loader/Loader";
import SolidIcon from "@/_ui/Icon/SolidIcons";

export const PasswordInput = function PasswordInput({
  height,
  validate,
  properties,
  styles,
  setExposedVariable,
  fireEvent,
  component,
  darkMode,
  dataCy,
  isResizing,
  adjustHeightBasedOnAlignment,
  currentLayout,
}) {
  const textInputRef = useRef();
  const labelRef = useRef();

  const { loadingState, tooltip, disabledState, label, placeholder } =
    properties;
  const {
    padding,
    borderRadius,
    borderColor,
    backgroundColor,
    textColor,
    boxShadow,
    width,
    alignment,
    direction,
    color,
    auto,
    errTextColor,
    iconColor,
  } = styles;

  const [disable, setDisable] = useState(disabledState || loadingState);
  const [passwordValue, setPasswordValue] = useState(properties.value);
  const [visibility, setVisibility] = useState(properties.visibility);
  const { isValid, validationError } = validate(passwordValue);
  const [showValidationError, setShowValidationError] = useState(false);
  const currentState = useCurrentState();
  const isMandatory = resolveReferences(
    component?.definition?.validation?.mandatory?.value,
    currentState
  );
  const [labelWidth, setLabelWidth] = useState(0);
  const defaultAlignment =
    alignment === "side" || alignment === "top" ? alignment : "side";
  const [iconVisibility, setIconVisibility] = useState(false);
  const [loading, setLoading] = useState(loadingState);
  const [isFocused, setIsFocused] = useState(false);
  const tinycolor = require("tinycolor2");

  const _width = (width / 100) * 70; // Max width which label can go is 70% for better UX calculate width based on this value

  const computedStyles = {
    height:
      height == 40
        ? padding == "default"
          ? "36px"
          : "40px"
        : padding == "default"
        ? height - 4
        : height,
    borderRadius: `${borderRadius}px`,
    color: darkMode && textColor === "#11181C" ? "#ECEDEE" : textColor,
    borderColor: isFocused
      ? "#3E63DD"
      : ["#D7DBDF"].includes(borderColor)
      ? darkMode
        ? "#6D757D7A"
        : "#6A727C47"
      : borderColor,
    "--tblr-input-border-color-darker": tinycolor(borderColor)
      .darken(24)
      .toString(),
    backgroundColor:
      darkMode && ["#fff", "#ffffff"].includes(backgroundColor)
        ? "#313538"
        : backgroundColor,
    boxShadow: boxShadow,
    padding: styles.iconVisibility
      ? padding == "default"
        ? "8px 10px 8px 29px"
        : "8px 10px 8px 29px"
      : "8px 10px 8px 10px",
    flex: padding !== "none" && 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const loaderStyle = {
    right:
      direction === "right" &&
      defaultAlignment === "side" &&
      ((label?.length > 0 && width > 0) ||
        (auto && width == 0 && label&& label?.length != 0))
        ? `${labelWidth + 23}px`
        : padding == "default"
        ? "11px"
        : "11px",

    // top: `${defaultAlignment === 'top' ? '53%' : ''}`,
    // transform: alignment == 'top' && label?.length == 0 && 'translateY(-50%)',
    top: `${
      defaultAlignment === "top"
        ? ((label?.length > 0 && width > 0) ||
            (auto && width == 0 && label&& label?.length != 0)) &&
          "calc(50% + 10px)"
        : ""
    }`,
    transform:
      defaultAlignment === "top" &&
      ((label?.length > 0 && width > 0) ||
        (auto && width == 0 && label&& label?.length != 0)) &&
      " translateY(-50%)",
    zIndex: 3,
  };

  useEffect(() => {
    setExposedVariable("label", label);
  }, [label]);

  useEffect(() => {
    if (labelRef.current) {
      const absolutewidth = labelRef.current.getBoundingClientRect().width;
      padding == "default"
        ? setLabelWidth(absolutewidth)
        : setLabelWidth(absolutewidth);
    } else setLabelWidth(0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isResizing,
    width,
    auto,
    defaultAlignment,
    component?.definition?.styles?.iconVisibility?.value,
    label?.length,
    isMandatory,
    padding,
    direction,
    alignment,
    isMandatory,
    labelRef?.current?.getBoundingClientRect()?.width,
  ]);

  useEffect(() => {
    disable !== disabledState && setDisable(disabledState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledState]);

  useEffect(() => {
    visibility !== properties.visibility &&
      setVisibility(properties.visibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.visibility]);

  useEffect(() => {
    loading !== loadingState && setLoading(loadingState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState]);

  useEffect(() => {
    setExposedVariable("isValid", isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  useEffect(() => {
    setPasswordValue(properties.value);
    setExposedVariable("value", properties?.value ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.value]);

  useEffect(() => {
    setExposedVariable("setFocus", async function () {
      textInputRef.current.focus();
    });
    setExposedVariable("setBlur", async function () {
      textInputRef.current.blur();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setExposedVariable("setText", async function (text) {
      setPasswordValue(text);
      setExposedVariable("value", text).then(fireEvent("onChange"));
    });
    setExposedVariable("clear", async function () {
      setPasswordValue("");
      setExposedVariable("value", "").then(fireEvent("onChange"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPasswordValue]);

  const iconName = styles.icon; // Replace with the name of the icon you want
  // eslint-disable-next-line import/namespace
  const IconElement =
    Icons[iconName] == undefined ? Icons["IconHome2"] : Icons[iconName];
  // eslint-disable-next-line import/namespace

  useEffect(() => {
    if (
      alignment == "top" &&
      ((label?.length > 0 && width > 0) ||
        (auto && width == 0 &&label&&  label?.length != 0))
    )
      adjustHeightBasedOnAlignment(true);
    else adjustHeightBasedOnAlignment(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignment, label?.length, currentLayout,width,auto]);

  useEffect(() => {
    setExposedVariable("isMandatory", isMandatory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMandatory]);

  useEffect(() => {
    setExposedVariable("isLoading", loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    setExposedVariable("setLoading", async function (loading) {
      setLoading(loading);
      setExposedVariable("isLoading", loading);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.loadingState]);

  useEffect(() => {
    setExposedVariable("isVisible", visibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility]);

  useEffect(() => {
    setExposedVariable("setVisibility", async function (state) {
      setVisibility(state);
      setExposedVariable("isVisible", state);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.visibility]);

  useEffect(() => {
    setExposedVariable("setDisable", async function (disable) {
      setDisable(disable);
      setExposedVariable("isDisabled", disable);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledState]);

  useEffect(() => {
    setExposedVariable("isDisabled", disable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disable]);

  const renderInput = () => (
    <>
      <div
        data-disabled={disable || loading}
        className={`text-input  d-flex  ${
          defaultAlignment === "top" &&
          ((width != 0 && label&& label?.length != 0) ||
            (auto && width == 0 && label&& label?.length != 0))
            ? "flex-column"
            : "align-items-center "
        }  ${
          direction === "right" && defaultAlignment === "side"
            ? "flex-row-reverse"
            : ""
        }
      ${direction === "right" && defaultAlignment === "top" ? "text-right" : ""}
      ${visibility || "invisible"}`}
        style={{
          // padding: padding === 'default' ? '2px' : '',
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* {label && (width > 0 || auto) && (
          <label
            ref={labelRef}
            style={{
              color: darkMode && color === '#11181C' ? '#fff' : color,
              width: label?.length === 0 ? '0%' : auto ? 'auto' : defaultAlignment === 'side' ? `${width}%` : '100%',
              maxWidth: auto && defaultAlignment === 'side' ? '70%' : '100%',
              marginRight: label?.length > 0 && direction === 'left' && defaultAlignment === 'side' ? '9px' : '',
              marginLeft: label?.length > 0 && direction === 'right' && defaultAlignment === 'side' ? '9px' : '',
              display: 'flex',
              fontWeight: 500,
              justifyContent: direction == 'right' ? 'flex-end' : 'flex-start',
              fontSize: '12px',
              height: '20px',
            }}
          >
            <span
              style={{
                overflow: label?.length > 18 && 'hidden', // Hide any content that overflows the box
                textOverflow: 'ellipsis', // Display ellipsis for overflowed content
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {label}
            </span>{' '}
            <span style={{ color: '#DB4324', marginLeft: '1px' }}>{isMandatory && '*'}</span>
          </label>
        )} */}
        {label && (width > 0 || auto) && (
          <label
            ref={labelRef}
            style={{
              color: darkMode && color === "#11181C" ? "#fff" : color,
              width:
                label?.length === 0
                  ? "0%"
                  : auto
                  ? "auto"
                  : defaultAlignment === "side"
                  ? `${_width}%`
                  : "100%",
              maxWidth: defaultAlignment === "side" ? "70%" : "100%",
              marginRight:
                label?.length > 0 &&
                direction === "left" &&
                defaultAlignment === "side"
                  ? "12px"
                  : "",
              marginLeft:
                label?.length > 0 &&
                direction === "right" &&
                defaultAlignment === "side"
                  ? "12px"
                  : "",
              display: "flex",
              fontWeight: 500,
              justifyContent: direction == "right" ? "flex-end" : "flex-start",
              fontSize: "12px",
              height: defaultAlignment === "top" && "20px",
              // flex: '1',
              // whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}
          >
            <p
              style={{
                position: "relative", // Ensure the parent element is positioned relatively
                overflow: label?.length > 18 && "hidden", // Hide any content that overflows the box
                textOverflow: "ellipsis", // Display ellipsis for overflowed content
                whiteSpace: "nowrap",
                display: "block",
                margin: "0px",
                // flex: "1",
              }}
            >
              {label}
              {isMandatory && <span style={{ color: "#DB4324" }}>*</span>}
            </p>
          </label>
        )}
        {component?.definition?.styles?.iconVisibility?.value &&
          !isResizing && (
            // <IconElement
            //   style={{
            //     width: '16px',
            //     height: '16px',
            //     left:
            //       direction === 'right'
            //         ? padding == 'default'
            //           ? '13px'
            //           : '10px'
            //         : defaultAlignment === 'top'
            //         ? padding == 'default'
            //           ? '13px'
            //           : '10px'
            //         : `${labelWidth + 6}px`,
            //     position: 'absolute',
            //     top: `${
            //       defaultAlignment === 'side' ? '50%' : label?.length > 0 && width > 0 ? 'calc(50% + 10px)' : '50%'
            //     }`,
            //     transform: ' translateY(-50%)',
            //     color: iconColor,
            //   }}
            //   stroke={1.5}
            // />
            <IconElement
              data-cy={"text-input-icon"}
              style={{
                width: "16px",
                height: "16px",
                left:
                  direction === "right"
                    ? padding == "default"
                      ? "11px"
                      : "11px"
                    : defaultAlignment === "top"
                    ? padding == "default"
                      ? "11px"
                      : "11px"
                    : (label?.length > 0 && width > 0) ||
                      (auto && width == 0 && label&& label?.length != 0)
                    ? `${labelWidth + 23}px`
                    : "11px", //23 ::  is 10 px inside the input + 1 px border + 12px margin right
                position: "absolute",
                top: `${
                  defaultAlignment === "side"
                    ? "50%"
                    : (label?.length > 0 && width > 0) ||
                      (auto && width == 0 && label&& label?.length != 0)
                    ? "calc(50% + 10px)"
                    : "50%"
                }`,
                transform: " translateY(-50%)",
                color: iconColor,
                zIndex: 3,
              }}
              stroke={1.5}
            />
          )}
        {!loading && !isResizing && (
          <div
            onClick={() => {
              setIconVisibility(!iconVisibility);
            }}
            style={{
              width: "16px",
              height: "16px",
              position: "absolute",
              right:
                direction === "right" &&
                defaultAlignment === "side" &&
                ((label?.length > 0 && width > 0) ||
                  (auto && width == 0 && label&& label?.length != 0))
                  ? `${labelWidth + 23}px`
                  : padding == "default"
                  ? "11px"
                  : "11px",
              top: `${
                defaultAlignment === "top"
                  ? (label?.length > 0 && width > 0 || auto && width == 0 && label && label?.length != 0) &&
                    "calc(50% + 10px)"
                  : ""
              }`,
              transform:
                defaultAlignment === "top" &&
                ((label?.length > 0 && width > 0) ||
                  (auto && width == 0 && label&& label?.length != 0)) &&
                " translateY(-50%)",
              display: "flex",
              zIndex: 3,
            }}
            // style={{ ...loaderStyle }}
            stroke={1.5}
          >
            <SolidIcon
              width={16}
              className="password-component-eye"
              name={!iconVisibility ? "eye1" : "eyedisable"}
            />
          </div>
        )}
        <input
          className={`tj-text-input-widget ${
            !isValid && showValidationError ? "is-invalid" : ""
          } validation-without-icon ${darkMode && "dark-theme-placeholder"}`}
          ref={textInputRef}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              setPasswordValue(e.target.value);
              setExposedVariable("value", e.target.value);
              fireEvent("onEnterPressed");
            }
          }}
          onChange={(e) => {
            setPasswordValue(e.target.value);
            setExposedVariable("value", e.target.value);
            fireEvent("onChange");
          }}
          onBlur={(e) => {
            setIsFocused(false);
            setShowValidationError(true);
            e.stopPropagation();
            fireEvent("onBlur");
          }}
          onFocus={(e) => {
            setIsFocused(true);
            e.stopPropagation();
            setTimeout(() => {
              fireEvent("onFocus");
            }, 0);
          }}
          type={!iconVisibility ? "password" : "text"}
          placeholder={placeholder}
          style={computedStyles}
          value={passwordValue}
          data-cy={dataCy}
          disabled={disable || loading}
        />
        {loading && <Loader style={{ ...loaderStyle }} width="16" />}
      </div>
      {showValidationError && visibility && (
        <div
          className="tj-text-sm"
          data-cy={`${String(component.name).toLowerCase()}-invalid-feedback`}
          style={{
            color: errTextColor,
            textAlign: direction === "left" && "end",
          }}
        >
          {showValidationError && validationError}
        </div>
      )}
    </>
  );

  return <div>{renderInput()}</div>;
};
