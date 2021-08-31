import React from 'react';
import { resolveReferences, getParsedValue } from '@/_helpers/utils';

class Switch extends React.Component {
    render() {
      const {
        on,
        onClick,
        onChange,
        disableState
      } = this.props
      return (
          <label className="form-check form-switch form-check-inline">
            <input
              disabled={disableState}
              className="form-check-input"
              type="checkbox"
              checked={on}
              onChange={onChange}
              onClick={onClick}
            />
        </label>
      )
    }
  }

export const ToggleSwitch = ({
  id,
  width,
  height,
  component,
  onComponentClick,
  currentState,
  onComponentOptionChanged,
  onEvent
}) => {
    
  const [on, setOn] = React.useState(false)
  const label = component.definition.properties.label.value;
  const textColorProperty = component.definition.styles.textColor;
  const textColor = textColorProperty ? textColorProperty.value : '#000';
  const widgetVisibility = component.definition.styles?.visibility?.value || true;
  const disableState = component.definition.styles?.disableState?.value || false;

  const parsedDisableState = typeof disableState !== 'boolean' ? getParsedValue(resolveReferences, disableState, currentState) : disableState;


  let parsedWidgetVisibility = widgetVisibility;
  
  try {
    parsedWidgetVisibility = resolveReferences(parsedWidgetVisibility, currentState, []);
  } catch (err) { console.log(err); }

  function toggleValue(e) {
    const toggled = e.target.checked;
    onComponentOptionChanged(component, 'value', toggled);
    onEvent('onChange', { component });

  }

  const toggle = () => setOn(!on)

  return (
    <div className="row  py-1" style={{ width, height, display:parsedWidgetVisibility ? '' : 'none' }} onClick={event => {event.stopPropagation(); onComponentClick(id, component)}}>
        <span className="form-check-label form-check-label col-auto" style={{color: textColor}}>{label}</span>
        <div className="col">
          <Switch disableState={parsedDisableState} on={on} onClick={toggle} onChange={toggleValue} />
        </div>
    </div>
  );
};
