import React, { useEffect, useMemo, useState } from 'react';
import { useSpring, config, animated } from 'react-spring';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
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
import useHeight from '@/_hooks/use-height-transition';
import { Portal } from '@/_components/Portal';

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
  componentName = null,
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
  const [heightRef, currentHeight] = useHeight();
  const slideInStyles = useSpring({
    config: { ...config.stiff },
    from: { opacity: 0, height: 0 },
    to: {
      opacity: isFocused ? 1 : 0,
      height: isFocused ? currentHeight : 0,
    },
  });
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

  const getPreviewContent = (content, type) => {
    switch (type) {
      case 'object':
        return JSON.stringify(content);
      case 'boolean':
        return content.toString();
      default:
        return content;
    }
  };

  const getPreview = () => {
    const [preview, error] = resolveReferences(currentValue, realState, null, {}, true);

    if (error) {
      return (
        <animated.div style={{ ...slideInStyles, overflow: 'hidden' }}>
          <div ref={heightRef} className="dynamic-variable-preview bg-red-lt px-1 py-1">
            <div>
              <div className="heading my-1">
                <span>Error</span>
              </div>
              {error.toString()}
            </div>
          </div>
        </animated.div>
      );
    }

    const previewType = typeof preview;
    const content = getPreviewContent(preview, previewType);

    return (
      <animated.div style={{ ...slideInStyles, overflow: 'hidden' }}>
        <div ref={heightRef} className="dynamic-variable-preview bg-green-lt px-1 py-1">
          <div>
            <div className="heading my-1">
              <span>{previewType}</span>
            </div>
            {content}
          </div>
        </div>
      </animated.div>
    );
  };
  enablePreview = enablePreview ?? true;

  const [isOpen, setIsOpen] = React.useState(false);

  const [portalOptions, setPortalOptions] = React.useState({});

  const handleToggle = (bool) => {
    if (!isOpen) {
      setIsOpen(bool);
    }

    setPortalOptions({ componentName: componentName });
  };

  const portalOpt = {
    lineNumbers: true,
    lineWrapping: true,
    singleLine: true,
    mode: mode || 'handlebars',
    tabSize: 2,
    theme: 'duotone-light',
    readOnly: false,
    highlightSelectionMatches: true,
    placeholder,
  };

  return (
    <div className="code-hinter-wrapper" style={{ width: '100%' }}>
      <CodeHinter.PopupIcon callback={handleToggle} />
      <div
        className={`code-hinter ${className || 'codehinter-default-input'}`}
        key={suggestions.length}
        style={{ height: height || 'auto', minHeight, maxHeight: '320px', overflow: 'auto' }}
      >
        <CodeMirror
          value={initialValue}
          realState={realState}
          scrollbarStyle={null}
          height={height || 'auto'}
          onFocus={() => setFocused(true)}
          onBlur={(editor) => {
            const value = editor.getValue();
            onChange(value);
            setFocused(false);
          }}
          onChange={(editor) => valueChanged(editor, onChange, suggestions, ignoreBraces)}
          onBeforeChange={(editor, change) => onBeforeChange(editor, change, ignoreBraces)}
          options={options}
          // lineWrapping={true}
          // viewportMargin={Infinity}
        />
      </div>

      {enablePreview && !isOpen && getPreview()}
      <React.Fragment>
        {isOpen && (
          <Portal className="modal-portal-wrapper" isOpen={isOpen} trigger={setIsOpen} dependencies={portalOptions}>
            {/* <div className="w-100">
              <code className="mx-2 text-info">{componentName}</code>
            </div> */}
            <CodeMirror options={portalOpt} />
          </Portal>
        )}
      </React.Fragment>
    </div>
  );
}

const PopupIcon = ({ callback }) => {
  return (
    <div className="d-flex justify-content-end">
      <OverlayTrigger
        trigger={['hover', 'focus']}
        placement="top"
        delay={{ show: 800, hide: 100 }}
        overlay={<Tooltip id="button-tooltip">{'Pop out code editor into a new window'}</Tooltip>}
      >
        <img
          className="svg-icon m-2 popup-btn"
          src="/assets/images/icons/expand.svg"
          width="12"
          height="12"
          onClick={(e) => {
            e.stopPropagation();
            callback(true);
          }}
        />
      </OverlayTrigger>
    </div>
  );
};

CodeHinter.PopupIcon = PopupIcon;
