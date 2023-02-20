import React from 'react';
import Select from '@/_ui/Select';

export const RenderEditor = ({
  annotation,
  labels,
  setAnnotation,
  setAnnotations,
  setExposedVariable,
  fireEvent,
  darkMode,
  selectElementStyles,
}) => {
  const { geometry } = annotation;
  if (!geometry) return null;
  const selectOptions = labels.map((label) => {
    return { name: label, value: label };
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${annotation.geometry.x}%`,
        top: `${annotation.geometry.y + annotation.geometry.height}%`,
        right: `${annotation.geometry.x + annotation.geometry.width}%`,
        width: `${annotation.geometry.width}%`,
        minWidth: '125px',
      }}
      className="col"
    >
      <Select
        options={selectOptions}
        onChange={(value) => {
          setAnnotation({});
          setAnnotations((prevState) => {
            const annotations = prevState.concat({
              geometry,
              data: {
                text: value,
                id: Math.random(),
              },
            });
            setExposedVariable('annotations', annotations);
            fireEvent('onChange');
            return annotations;
          });
        }}
        className={`${darkMode ? 'select-search-dark' : 'select-search'}`}
        useCustomStyles={true}
        useMenuPortal={true}
        styles={selectElementStyles(darkMode, '100%')}
      />
    </div>
  );
};
