import '@/_styles/widgets/star-rating.scss';

import React from 'react';
import { useTrail } from 'react-spring';
import { resolveReferences } from '@/_helpers/utils';

import Star from './star';

export const StarRating = function StarRating({ component, onComponentOptionChanged, currentState, onEvent }) {
  const label = component.definition.properties.label.value;
  const maxRating = +component.definition.properties.maxRating.value ?? 5;
  const allowHalfStar = component.definition.properties.allowHalfStar.value ?? false;
  const textColorProperty = component.definition.styles.textColor;
  const color = textColorProperty ? textColorProperty.value : '#ffb400';

  const tooltips = component.definition.properties.tooltips.value ?? [];
  const _tooltips = resolveReferences(tooltips, currentState, []) ?? [];

  const animatedStars = useTrail(maxRating, {
    config: {
      friction: 22,
      tension: 500,
    },
    from: {
      opacity: 0,
      transform: 'scale(0.8)',
    },
    opacity: 1,
    transform: 'scale(1)',
  });

  const [currentRatingIndex, setRatingIndex] = React.useState(maxRating);
  const [hoverIndex, setHoverIndex] = React.useState(null);

  function handleClick() {
    onComponentOptionChanged(component, 'value', currentRatingIndex);
    onEvent('onChange', { component });
  }

  const getActive = (index) => {
    if (hoverIndex !== null) return index <= hoverIndex;
    return index <= currentRatingIndex;
  };

  const isHalfStar = (index) => {
    if (hoverIndex !== null) return false;
    return index - 0.5 === currentRatingIndex;
  };

  const getTooltip = (index) => {
    if (_tooltips && Array.isArray(_tooltips) && _tooltips.length > 0) return _tooltips[index];
    return '';
  };

  return (
    <div className="star-rating">
      <span className="label form-check-label form-check-label col-auto">{label}</span>
      {animatedStars.map((props, index) => (
        <Star
          tooltip={getTooltip(index)}
          active={getActive(index)}
          isHalfStar={isHalfStar(index)}
          maxRating={maxRating}
          onClick={(e, idx) => {
            e.stopPropagation();
            setRatingIndex(idx);
            handleClick();
          }}
          allowHalfStar={allowHalfStar}
          key={index}
          index={index}
          color={color}
          style={{ ...props }}
          setHoverIndex={setHoverIndex}
        />
      ))}
    </div>
  );
};
