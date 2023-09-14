import React from 'react';

const Calendar = ({ fill = '#D7DBDF', width = 24, className = '', viewBox = '0 0 49 48' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={width} height={width} viewBox={viewBox}>
    <path fill={fill} d="M2.889 16.476V40.5a5.5 5.5 0 005.5 5.5h33a5.5 5.5 0 005.5-5.5V16.476h-44z"></path>
    <path
      fill="#3E63DD"
      fillRule="evenodd"
      d="M13.889 2a3.143 3.143 0 013.143 3.143v1.571h15.714V5.143a3.143 3.143 0 016.286 0v1.571h2.357c2.788 0 5.5 2.08 5.5 5.174v4.604H2.889v-4.604c0-3.093 2.711-5.174 5.5-5.174h2.357V5.143A3.143 3.143 0 0113.889 2zM24.888 21.967c1.085 0 1.965.88 1.965 1.965v12.177h2.75a1.964 1.964 0 010 3.929h-9.429a1.964 1.964 0 110-3.929h2.75v-6.905a5.5 5.5 0 01-1.571.227h-1.179a1.964 1.964 0 010-3.928h1.179c.867 0 1.571-.704 1.571-1.571 0-1.085.88-1.965 1.964-1.965z"
      clipRule="evenodd"
    ></path>
  </svg>
);

export default Calendar;
