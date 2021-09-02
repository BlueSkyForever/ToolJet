import React from 'react';
import { Editor, EditorState } from "draft-js";
import "draft-js/dist/Draft.css";
import { DraftEditor } from './DraftEditor';
import { resolveReferences, getParsedValue } from '@/_helpers/utils';

export const RichTextEditor = function RichTextEditor({
  id,
  width,
  height,
  component,
  onComponentClick,
  currentState,
  onComponentOptionChanged
}) {

  const placeholder = component.definition.properties.placeholder.value;
  const widgetVisibility = component.definition.styles?.visibility?.value ?? true;
  const disableState = component.definition.styles?.disableState?.value ?? false;

  const parsedDisableState = typeof disableState !== 'boolean' ? getParsedValue(resolveReferences, disableState, currentState) : disableState;

  let parsedWidgetVisibility = widgetVisibility;
  
  try {
    parsedWidgetVisibility = resolveReferences(parsedWidgetVisibility, currentState, []);
  } catch (err) { console.log(err); }

  function handleChange(html) {
    onComponentOptionChanged(component, 'value', html);
  }

  return (
    <div data-disabled={parsedDisableState} style={{ width: `${width}px`, height: `${height}px`, display:parsedWidgetVisibility ? '' : 'none'  }} onClick={event => {event.stopPropagation(); onComponentClick(id, component)}}>
      <DraftEditor
        handleChange={handleChange}
        height={height}
        width={width}
        placeholder={placeholder}
      ></DraftEditor>
    </div>
  );
};
