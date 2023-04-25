import React from 'react';

const SadRectangle = ({ fill = '#C1C8CD', width = '25', className = '', viewBox = '0 0 25 25' }) => (
  <svg
    width={width}
    height={width}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18.5 2.78906H6.5C4.29086 2.78906 2.5 4.57992 2.5 6.78906V18.7891C2.5 20.9982 4.29086 22.7891 6.5 22.7891H18.5C20.7091 22.7891 22.5 20.9982 22.5 18.7891V6.78906C22.5 4.57992 20.7091 2.78906 18.5 2.78906ZM9.99455 17.3529C9.6849 17.6246 9.21354 17.5957 8.93945 17.2873C8.66426 16.9777 8.69215 16.5037 9.00174 16.2285L9.27679 16.0171C9.43912 15.9042 9.67203 15.7585 9.96968 15.6142C10.565 15.3255 11.4268 15.0391 12.5 15.0391C13.5733 15.0391 14.435 15.3255 15.0303 15.6142C15.328 15.7585 15.5609 15.9042 15.7232 16.0171C15.8045 16.0737 15.8685 16.1223 15.9145 16.1588L15.9983 16.2285C16.3079 16.5037 16.3358 16.9777 16.0606 17.2873C15.7865 17.5957 15.3151 17.6246 15.0055 17.3529L14.8666 17.2485C14.7594 17.1739 14.5939 17.0696 14.3759 16.9639C13.94 16.7526 13.3018 16.5391 12.5 16.5391C11.6983 16.5391 11.06 16.7526 10.6241 16.9639C10.4061 17.0696 10.2406 17.1739 10.1334 17.2485L9.99455 17.3529ZM17.5 10.7891C17.5 11.3413 17.0523 11.7891 16.5 11.7891C15.9477 11.7891 15.5 11.3413 15.5 10.7891C15.5 10.2368 15.9477 9.78906 16.5 9.78906C17.0523 9.78906 17.5 10.2368 17.5 10.7891ZM8.5 11.7891C9.05228 11.7891 9.5 11.3413 9.5 10.7891C9.5 10.2368 9.05228 9.78906 8.5 9.78906C7.94772 9.78906 7.5 10.2368 7.5 10.7891C7.5 11.3413 7.94772 11.7891 8.5 11.7891Z"
      fill={fill}
    />
  </svg>
);

export default SadRectangle;
