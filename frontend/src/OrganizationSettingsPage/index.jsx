import React, { useEffect, useState, useContext } from 'react';
import cx from 'classnames';
import Layout from '@/_ui/Layout';
import { ManageOrgUsers } from '@/ManageOrgUsers';
import { ManageGroupPermissions } from '@/ManageGroupPermissions';
import { ManageSSO } from '@/ManageSSO';
import { ManageOrgVars } from '@/ManageOrgVars';
import { authenticationService } from '@/_services';
import { BreadCrumbContext } from '../App/App';
import FolderList from '@/_ui/FolderList/FolderList';
import { OrganizationList } from '../_components/OrganizationManager/List';

export function OrganizationSettings(props) {
  const { admin } = authenticationService.currentUserValue;
  const [selectedTab, setSelectedTab] = useState(admin ? 'users' : 'manageEnvVars');
  const { updateSidebarNAV } = useContext(BreadCrumbContext);

  useEffect(() => {
    updateSidebarNAV('users');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sideBarNavs = ['Users', 'Groups', 'SSO', 'Workspace variables'];
  const defaultOrgName = (groupName) => {
    switch (groupName) {
      case 'Users':
        return 'users';
      case 'Groups':
        return 'manageGroups';
      case 'SSO':
        return 'manageSSO';
      case 'Workspace variables':
        return 'manageEnvVars';

      default:
        return groupName;
    }
  };

  return (
    <Layout switchDarkMode={props.switchDarkMode} darkMode={props.darkMode}>
      <div className="wrapper organization-settings-page">
        <div className="row gx-0">
          <div className="organization-page-sidebar col ">
            <div className="workspace-nav-list-wrap">
              {sideBarNavs.map((item, index) => {
                return (
                  <>
                    <FolderList
                      className="workspace-settings-nav-items"
                      key={index}
                      onClick={() => {
                        setSelectedTab(defaultOrgName(item));
                        updateSidebarNAV(item);
                      }}
                      selectedItem={selectedTab == defaultOrgName(item)}
                    >
                      {item}
                    </FolderList>
                  </>
                );
              })}
            </div>
            <OrganizationList />
          </div>

          <div
            className={cx('col workspace-content-wrapper', {
              'bg-light-gray': !props.darkMode,
            })}
            style={{ paddingTop: '40px' }}
          >
            <div className="w-100">
              {selectedTab === 'users' && <ManageOrgUsers darkMode={props.darkMode} />}
              {selectedTab === 'manageGroups' && <ManageGroupPermissions darkMode={props.darkMode} />}
              {selectedTab === 'manageSSO' && <ManageSSO />}
              {selectedTab === 'manageEnvVars' && <ManageOrgVars darkMode={props.darkMode} />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
