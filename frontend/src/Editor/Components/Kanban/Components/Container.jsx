import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import '@/_styles/widgets/kanban.scss';

export const Container = ({ children, id, disabled, ...props }) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  const { kanbanProps, style, label } = props;
  const {
    styles: { accentColor },
  } = kanbanProps;

  const hexaCodeToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.2)`;
  };

  const colAccentColor = {
    color: accentColor ?? '#4d72fa',
    backgroundColor: accentColor ? hexaCodeToRgb(accentColor) : hexaCodeToRgb('#4d72fa'),
  };

  return (
    <div
      {...props}
      ref={disabled ? undefined : setNodeRef}
      style={{
        ...style,
        '--columns': 1,
      }}
      className={'kanban-container scrollable'}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {label ? (
        <div className="header">
          <span style={colAccentColor} className="container-name">
            {label}
          </span>
        </div>
      ) : null}
      <ul>{children}</ul>
    </div>
  );
};
