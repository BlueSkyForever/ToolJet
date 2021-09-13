import React, { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import 'codemirror/mode/handlebars/handlebars';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/display/placeholder';
import 'codemirror/addon/search/match-highlighter';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/theme/duotone-light.css';
import 'codemirror/theme/monokai.css';
import { getSuggestionKeys, onBeforeChange, handleChange } from './utils';
import { resolveReferences } from '@/_helpers/utils';

export function CodeHinter({
  initialValue,
  onChange,
  currentState,
  mode,
  theme,
  lineNumbers,
  className,
  placeholder,
  ignoreBraces,
  enablePreview,
  height,
  minHeight,
  lineWrapping,
}) {
  const options = {
    lineNumbers: lineNumbers,
    lineWrapping: lineWrapping,
    singleLine: true,
    mode: mode || 'handlebars',
    tabSize: 2,
    theme: theme || 'default',
    readOnly: false,
    highlightSelectionMatches: true,
    placeholder,
  };

  const [realState, setRealState] = useState(currentState);
  const [currentValue, setCurrentValue] = useState(initialValue);

  useEffect(() => {
    setRealState(currentState);
  }, [currentState.components]);

  let suggestions = useMemo(() => {
    return getSuggestionKeys(realState);
  }, [realState.components, realState.queries]);

  function valueChanged(editor, onChange, suggestions, ignoreBraces) {
    handleChange(editor, onChange, suggestions, ignoreBraces);
    setCurrentValue(editor.getValue());
  }

  const getPreview = () => {
    const preview = resolveReferences(currentValue, realState);
    const previewType = typeof preview;
    switch (previewType) {
      case 'object':
        return JSON.stringify(preview);

      default:
        return preview;
    }
  };

  return (
    <div
      className={`code-hinter ${className || 'codehinter-default-input'}`}
      key={suggestions.length}
      style={{ height: height || 'auto', minHeight, maxHeight: '320px', overflow: 'auto' }}
    >
      <CodeMirror
        value={initialValue}
        realState={realState}
        scrollbarStyle={null}
        height={height}
        onBlur={(editor) => {
          const value = editor.getValue();
          onChange(value);
        }}
        onChange={(editor) => valueChanged(editor, onChange, suggestions, ignoreBraces)}
        onBeforeChange={(editor, change) => onBeforeChange(editor, change, ignoreBraces)}
        options={options}
      />
      {enablePreview && <div className="dynamic-variable-preview bg-green-lt px-1 py-1">{getPreview()}</div>}
    </div>
  );
}
