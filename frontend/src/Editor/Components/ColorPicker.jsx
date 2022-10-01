import React, { useState, useEffect } from 'react';
import { SketchPicker } from 'react-color';

export const ColorPicker = function ({
  width,
  properties,
  styles,
  setExposedVariable,
  darkMode,
  height,
  registerAction,
  fireEvent,
}) {
  const { visibility } = styles;
  const defaultColor = properties.defaultColor;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [color, setColor] = useState(defaultColor);

  const getRGBAValueFromHex = (hex) => {
    let c = hex.substring(1).split('');
    switch (c.length) {
      case 3:
        c = [c[0] + c[0], c[1] + c[1], c[2] + c[2], 'ff'];
        break;
      case 4:
        c = [c[0] + c[0], c[1] + c[1], c[2] + c[2], c[3] + c[3]];
        break;
      case 6:
        c = [c[0] + c[1], c[2] + c[3], c[4] + c[5], 'ff'];
        break;
      case 8:
        c = [c[0] + c[1], c[2] + c[3], c[4] + c[5], c[6] + c[7]];
        break;
    }
    c = c.map((char) => parseInt(char, 16).toString());
    c[3] = (Math.round((parseInt(c[3], 10) / 255) * 100) / 100).toString();
    return c;
  };
  const hexToRgba = (hex) => {
    const rgbaArray = getRGBAValueFromHex(hex);
    return `rgba(${rgbaArray[0]}, ${rgbaArray[1]}, ${rgbaArray[2]}, ${rgbaArray[3]})`;
  };
  const hexToRgb = (hex) => {
    const rgbaArray = getRGBAValueFromHex(hex);
    return `rgba(${rgbaArray[0]}, ${rgbaArray[1]}, ${rgbaArray[2]})`;
  };

  registerAction(
    'setColor',
    async function (color) {
      if (/^#(([\dA-Fa-f]{3}){1,2}|([\dA-Fa-f]{4}){1,2})$/.test(color)) {
        setExposedVariable('selectedColorHex', `${color}`).then(fireEvent('onChange'));
        setExposedVariable('selectedColorRGB', hexToRgb(color)).then(fireEvent('onChange'));
        setExposedVariable('selectedColorRGBA', hexToRgba(color)).then(fireEvent('onChange'));
        setColor(color);
        fireEvent('onChange');
      } else {
        setExposedVariable('selectedColorHex', 'undefined');
        setExposedVariable('selectedColorRGB', 'undefined');
        setExposedVariable('selectedColorRGBA', 'undefined');
        setColor('Invalid Color');
        fireEvent('onChange');
      }
    },
    [setColor]
  );

  useEffect(() => {
    if (/^#(([\dA-Fa-f]{3}){1,2}|([\dA-Fa-f]{4}){1,2})$/.test(defaultColor)) {
      setExposedVariable('selectedColorHex', `${defaultColor}`);
      setExposedVariable('selectedColorRGB', hexToRgb(defaultColor));
      setExposedVariable('selectedColorRGBA', hexToRgba(defaultColor));
      setColor(defaultColor);
    } else {
      setExposedVariable('selectedColorHex', 'undefined');
      setExposedVariable('selectedColorRGB', 'undefined');
      setExposedVariable('selectedColorRGBA', 'undefined');
      setColor(`Invalid Color`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultColor]);

  const handleColorChange = (color) => {
    const { r, g, b, a } = color.rgb;
    const { hex: hexColor } = color;
    setColor(hexColor);
    fireEvent('onChange');
    setExposedVariable('selectedColorHex', `${hexColor}`).then(fireEvent('onChange'));
    setExposedVariable('selectedColorRGB', `rgb(${r},${g},${b})`).then(fireEvent('onChange'));
    setExposedVariable('selectedColorRGBA', `rgb(${r},${g},${b},${a})`).then(fireEvent('onChange'));
  };
  //background color style for the div dispaying box filled by selected color
  const backgroundColorDivStyle = {
    background: `${color}`,
    width: '20px',
    height: '20px',
    border: `0.25px solid ${['#ffffff', '#fff', '#1f2936'].includes(color) && '#c5c8c9'}`,
  };

  const style = {
    borderRadius: '5px',
    height,
    padding: '0.5rem',
    border: `1px solid ${['#ffffff', '#fff', '#ffff', '#1f2936'].includes(color) && '#c5c8c9'}`,
    positin: 'relative',
  };
  const baseStyle = visibility
    ? darkMode
      ? { ...style, color: '#ffffff', backgroundColor: '#1F2936' }
      : { ...style, color: 'inherit' }
    : { display: 'none' };

  return (
    <div style={baseStyle} className="form-control">
      <div className="d-flex h-100 justify-content-between align-items-center" onClick={() => setShowColorPicker(true)}>
        <span>{color}</span>
        {!(color === `Invalid Color`) && <div style={backgroundColorDivStyle}></div>}
      </div>
      {showColorPicker && (
        <>
          <div
            className="position-absolute bottom-0"
            style={{ left: 0, right: 0 }}
            onMouseLeave={() => setShowColorPicker(false)}
            width={width}
          >
            <SketchPicker color={color} onChangeComplete={handleColorChange} />
          </div>
          <div className="comment-overlay" onClick={() => setShowColorPicker(false)}></div>
        </>
      )}
    </div>
  );
};
