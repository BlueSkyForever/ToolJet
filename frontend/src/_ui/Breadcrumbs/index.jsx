import React from 'react';
import { Link } from 'react-router-dom';
import useBreadcrumbs from 'use-react-router-breadcrumbs';

export const Breadcrumbs = () => {
  const breadcrumbs = useBreadcrumbs(routes, { excludePaths: ['/'] });
  return (
    <ol className="breadcrumb breadcrumb-arrows">
      {breadcrumbs.length === 0 && (
        <li className="breadcrumb-item font-weight-500">
          <Link to={'/'}>Apps</Link>
        </li>
      )}
      {breadcrumbs.map(({ breadcrumb }) => {
        return (
          <li key={breadcrumb.key} className="breadcrumb-item font-weight-500">
            <Link to={breadcrumb.key}>{breadcrumb}</Link>
          </li>
        );
      })}
    </ol>
  );
};

// define some custom breadcrumbs for certain routes (optional)
const routes = [
  // { path: '/', breadcrumb: 'Apps' },
  { path: '/database', breadcrumb: 'Tables' },
  { path: '/workspace-settings', breadcrumb: 'Workspace settings' },
];
