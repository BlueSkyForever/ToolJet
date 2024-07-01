import React from 'react';

const Search = ({ fill = '#C1C8CD', width = '24', className = '', viewBox = '0 0 25 25', style }) => (
  <svg
    width={width}
    height={width}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.85723 8.57132C2.85723 5.41545 5.41557 2.85711 8.57144 2.85711C11.7273 2.85711 14.2857 5.41545 14.2857 8.57132C14.2857 11.7272 11.7273 14.2855 8.57144 14.2855C5.41557 14.2855 2.85723 11.7272 2.85723 8.57132ZM8.57144 0C3.83763 0 0.00012207 3.83751 0.00012207 8.57132C0.00012207 13.3051 3.83763 17.1426 8.57144 17.1426C10.4225 17.1426 12.1366 16.5558 13.5377 15.5581L17.5612 19.5816C18.119 20.1395 19.0236 20.1395 19.5814 19.5816C20.1393 19.0238 20.1393 18.1192 19.5814 17.5614L15.5581 13.5379C16.5559 12.1367 17.1428 10.4226 17.1428 8.57132C17.1428 3.83751 13.3053 0 8.57144 0Z"
      fill={fill}
    />
  </svg>
);

export default Search;
