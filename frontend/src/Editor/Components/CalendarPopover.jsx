import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SubCustomDragLayer } from '../SubCustomDragLayer';
import { SubContainer } from '../SubContainer';

export const CalendarEventPopover = function ({ show, offset, calenderWidgetId, containerProps, removeComponent, popoverClosed }) {

  const parentRef = useRef(null);
  const [showPopover, setShow] = useState(show);
  const [top, setTop] = useState(0);
  const [left, setLeft] = useState(0);

  const minHeight = 400;
  let calendarBounds;
  let canvasBounds;

  const calendarElement = document.getElementById(calenderWidgetId);

  useEffect(() => {
    setShow(show);
  }, [show]);

  useEffect(() => {
    if (offset?.top && showPopover) {
      const _left = offset.left - calendarBounds.x + offset.width;
      const _top = (offset.top - calendarBounds.y) * 100 / calendarBounds.height;
      setTop(_top);
      setLeft(_left);
    }
  }, [offset?.top, showPopover]);

  if (calendarElement && showPopover) {
    calendarBounds = calendarElement.getBoundingClientRect();
    const canvasElement = document.getElementsByClassName('canvas-container')[0];
    canvasBounds = canvasElement.getBoundingClientRect();
  }

  return (
    <div

    >
      {showPopover &&
        <div
          style={{
            // backgroundColor: 'rgba(0, 0, 0, 0.6)', // This can be used for testing the overlay
            top: -(calendarBounds.y + top),
            left: -calendarBounds.x,
            zIndex: 10,
            position: 'fixed',
            height: canvasBounds.height + top,
            width: canvasBounds.width
          }}
          onClick={() => popoverClosed()}>
        </div>
      }
      <div
        style={{ position: 'absolute', zIndex: 100, width: '300px', maxWidth: '300px', minHeight, top: `${top}%`, left, display: showPopover ? 'block' : 'none' }}
        role="tooltip"
        x-placement="left"
        className="popover bs-popover-left shadow-lg"
        id="popover-basic"
        ref={parentRef}
        id={`${calenderWidgetId}-popover`}
      >
        {(parentRef.current && showPopover) &&
          <div
            class="popover-body"
            style={{ padding: 'unset', width: '100%', height: '100%', zIndex: 11 }}
          >
            <>
              <SubContainer containerCanvasWidth={300} parent={`${calenderWidgetId}-popover`} {...containerProps} parentRef={parentRef} removeComponent={removeComponent} />
              <SubCustomDragLayer parent={calenderWidgetId} parentRef={parentRef} currentLayout={containerProps.currentLayout} />
            </>

          </div>
        }
      </div>
    </div>

  );
};
