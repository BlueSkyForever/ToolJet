import React, { useEffect, useMemo, useState, Fragment } from 'react';

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
import CodePreview from './CodePreview';

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
  enablePreview = true,
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
  const [isFocused, setFocused] = useState(false);

  useEffect(() => {
    setRealState(currentState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentState.components]);

  let suggestions = useMemo(() => {
    return getSuggestionKeys(realState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realState.components, realState.queries]);

  function valueChanged(editor, onChange, suggestions, ignoreBraces) {
    handleChange(editor, onChange, suggestions, ignoreBraces);
    setCurrentValue(editor.getValue());
  }

  return (
    <Fragment>
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
          onFocus={() => setFocused(true)}
          onBlur={(editor) => {
            const value = editor.getValue();
            onChange(value);
            setFocused(false);
          }}
          onChange={(editor) => valueChanged(editor, onChange, suggestions, ignoreBraces)}
          onBeforeChange={(editor, change) => onBeforeChange(editor, change, ignoreBraces)}
          options={options}
        />
      </div>
      {enablePreview && <CodePreview currentValue={currentValue} realState={realState} isFocused={isFocused} />}
    </Fragment>
  );
}
