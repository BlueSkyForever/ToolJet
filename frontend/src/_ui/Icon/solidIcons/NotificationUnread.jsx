import React from 'react';

const NotificationUnread = ({ fill = '#C1C8CD', width = '25', className = '', viewBox = '0 0 25 25' }) => (
  <svg
    className={className}
    width={width}
    height={width}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.72281 18.7893H18.2772C20.1056 18.7893 21.1492 16.9502 20.0522 15.6614C19.5666 15.0909 19.2673 14.4142 19.1867 13.7046L19.0227 12.259C18.8512 12.2789 18.6767 12.2891 18.4999 12.2891C16.0147 12.2891 13.9999 10.2743 13.9999 7.78906C13.9999 6.81819 14.3074 5.91913 14.8303 5.18394C14.8102 5.17686 14.7901 5.16987 14.7699 5.16297V5.05925C14.7699 3.8056 13.7537 2.78931 12.5 2.78931C11.2463 2.78931 10.2301 3.8056 10.2301 5.05925V5.16297C8.08766 5.8965 6.5016 7.63994 6.26046 9.76449L5.81328 13.7046C5.73274 14.4142 5.43344 15.0909 4.94779 15.6614C3.85076 16.9502 4.89443 18.7893 6.72281 18.7893ZM21.5 7.78906C21.5 9.44592 20.1569 10.7891 18.5 10.7891C16.8431 10.7891 15.5 9.44592 15.5 7.78906C15.5 6.13221 16.8431 4.78906 18.5 4.78906C20.1569 4.78906 21.5 6.13221 21.5 7.78906ZM12.5 22.7893C13.8565 22.7893 15.0147 21.9885 15.4721 20.8608C15.4912 20.8138 15.5 20.7633 15.5 20.7126C15.5 20.4787 15.3104 20.2891 15.0765 20.2891H9.92349C9.6896 20.2891 9.5 20.4787 9.5 20.7126C9.5 20.7633 9.50883 20.8138 9.5279 20.8608C9.98528 21.9885 11.1435 22.7893 12.5 22.7893Z"
      fill={fill}
    />
  </svg>
);

export default NotificationUnread;
