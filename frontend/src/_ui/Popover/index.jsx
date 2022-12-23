import '@/_styles/popover.scss';
import React from 'react';
import * as Popover from '@radix-ui/react-popover';

const PopoverComponent = ({ children, className, popoverContent, hideCloseIcon = false, side = 'bottom' }) => (
  <Popover.Root>
    <Popover.Trigger asChild>
      <a>{children}</a>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content side={side} className={`PopoverContent ${className}`} sideOffset={5}>
        {popoverContent}
        {!hideCloseIcon && (
          <Popover.Close className="PopoverClose" aria-label="Close">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.01557 4.26655C4.27592 4.0062 4.69803 4.0062 4.95838 4.26655L8.48698 7.79515L12.0156 4.26655C12.2759 4.0062 12.698 4.0062 12.9584 4.26655C13.2187 4.5269 13.2187 4.94901 12.9584 5.20936L9.42979 8.73796L12.9584 12.2666C13.2187 12.5269 13.2187 12.949 12.9584 13.2094C12.698 13.4697 12.2759 13.4697 12.0156 13.2094L8.48698 9.68076L4.95838 13.2094C4.69803 13.4697 4.27592 13.4697 4.01557 13.2094C3.75523 12.949 3.75523 12.5269 4.01557 12.2666L7.54417 8.73796L4.01557 5.20936C3.75523 4.94901 3.75523 4.5269 4.01557 4.26655Z"
                fill="black"
              />
            </svg>
          </Popover.Close>
        )}
        <Popover.Arrow className="PopoverArrow" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);

export default PopoverComponent;
