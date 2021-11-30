import React from 'react';
import { appService, folderService, authenticationService } from '@/_services';
import { Pagination, Header, ConfirmDialog } from '@/_components';
import { Folders } from './Folders';
import { BlankPage } from './BlankPage';
import { toast } from 'react-toastify';
import AppList from './AppList';
class HomePage extends React.Component {
  constructor(props) {
    super(props);

    this.fileInput = React.createRef();
    this.state = {
      currentUser: authenticationService.currentUserValue,
      users: null,
      isLoading: true,
      creatingApp: false,
      isDeletingApp: false,
      isCloningApp: false,
      isExportingApp: false,
      isImportingApp: false,
      currentFolder: {},
      currentPage: 1,
      showAppDeletionConfirmation: false,
      apps: [],
      folders: [],
      meta: {
        count: 1,
        folders: [],
      },
    };
  }

  componentDidMount() {
    this.fetchApps(1, this.state.currentFolder.id);
    this.fetchFolders();
  }

  fetchApps = (page, folder) => {
    this.setState({
      apps: [],
      isLoading: true,
    });

    appService.getAll(page, folder).then((data) =>
      this.setState({
        apps: data.apps,
        meta: { ...this.state.meta, ...data.meta },
        isLoading: false,
      })
    );
  };

  fetchFolders = () => {
    this.setState({
      foldersLoading: true,
    });

    folderService.getAll().then((data) =>
      this.setState({
        folders: data.folders,
        foldersLoading: false,
      })
    );
  };

  pageChanged = (page) => {
    this.setState({ currentPage: page });
    this.fetchApps(page, this.state.currentFolder.id);
  };

  folderChanged = (folder) => {
    this.setState({ currentFolder: folder });
    this.fetchApps(1, folder.id);
  };

  foldersChanged = () => {
    this.fetchFolders();
  };

  createApp = () => {
    let _self = this;
    _self.setState({ creatingApp: true });
    appService
      .createApp()
      .then((data) => {
        _self.props.history.push(`/apps/${data.id}`);
      })
      .catch(({ error }) => {
        toast.error(error, { hideProgressBar: true, position: 'top-center' });
        _self.setState({ creatingApp: false });
      });
  };

  deleteApp = (app) => {
    this.setState({ showAppDeletionConfirmation: true, appToBeDeleted: app });
  };

  cloneApp = (app) => {
    this.setState({ isCloningApp: true });
    appService
      .cloneApp(app.id)
      .then((data) => {
        toast.info('App cloned successfully.', {
          hideProgressBar: true,
          position: 'top-center',
        });
        this.setState({ isCloningApp: false });
        this.props.history.push(`/apps/${data.id}`);
      })
      .catch(({ _error }) => {
        toast.error('Could not clone the app.', {
          hideProgressBar: true,
          position: 'top-center',
        });
        this.setState({ isCloningApp: false });
        console.log(_error);
      });
  };

  exportApp = (app) => {
    this.setState({ isExportingApp: true });
    appService
      .exportApp(app.id)
      .then((data) => {
        const appName = app.name.replace(/\s+/g, '-').toLowerCase();
        const fileName = `${appName}-export-${new Date().getTime()}`;
        // simulate link click download
        const json = JSON.stringify(data);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.setState({ isExportingApp: false });
      })
      .catch((error) => {
        toast.error('Could not export the app.', {
          hideProgressBar: true,
          position: 'top-center',
        });

        this.setState({ isExportingApp: false });
        console.log(error);
      });
  };

  handleImportApp = (event) => {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0], 'UTF-8');
    fileReader.onload = (event) => {
      const fileContent = event.target.result;
      this.setState({ isImportingApp: true });
      try {
        const requestBody = JSON.parse(fileContent);
        appService
          .importApp(requestBody)
          .then(() => {
            toast.info('App imported successfully.', {
              hideProgressBar: true,
              position: 'top-center',
            });
            this.setState({
              isImportingApp: false,
            });
            this.fetchApps(this.state.currentPage, this.state.currentFolder.id);
            this.fetchFolders();
          })
          .catch(({ error }) => {
            toast.error(`Could not import the app: ${error}`, {
              hideProgressBar: true,
              position: 'top-center',
            });
            this.setState({
              isImportingApp: false,
            });
          });
      } catch (error) {
        toast.error(`Could not import the app: ${error}`, {
          hideProgressBar: true,
          position: 'top-center',
        });
        this.setState({
          isImportingApp: false,
        });
      }
      // set file input as null to handle same file upload
      event.target.value = null;
    };
  };

  canUserPerform(user, action, app) {
    let permissionGrant;

    switch (action) {
      case 'create':
        permissionGrant = this.canAnyGroupPerformAction('app_create', user.group_permissions);
        break;
      case 'read':
      case 'update':
        permissionGrant =
          this.canAnyGroupPerformActionOnApp(action, user.app_group_permissions, app) ||
          this.isUserOwnerOfApp(user, app);
        break;
      case 'delete':
        permissionGrant =
          this.canAnyGroupPerformActionOnApp('delete', user.app_group_permissions, app) ||
          this.canAnyGroupPerformAction('app_delete', user.group_permissions) ||
          this.isUserOwnerOfApp(user, app);
        break;
      default:
        permissionGrant = false;
        break;
    }

    return permissionGrant;
  }

  canAnyGroupPerformActionOnApp(action, appGroupPermissions, app) {
    if (!appGroupPermissions) {
      return false;
    }

    const permissionsToCheck = appGroupPermissions.filter((permission) => permission.app_id == app.id);
    return this.canAnyGroupPerformAction(action, permissionsToCheck);
  }

  canAnyGroupPerformAction(action, permissions) {
    if (!permissions) {
      return false;
    }

    return permissions.some((p) => p[action]);
  }

  isUserOwnerOfApp(user, app) {
    return user.id == app.user_id;
  }

  canCreateApp = () => {
    return this.canUserPerform(this.state.currentUser, 'create');
  };

  canUpdateApp = (app) => {
    return this.canUserPerform(this.state.currentUser, 'update', app);
  };

  canDeleteApp = (app) => {
    return this.canUserPerform(this.state.currentUser, 'delete', app);
  };

  cancelDeleteAppDialog = () => {
    this.setState({
      isDeletingApp: false,
      appToBeDeleted: null,
      showAppDeletionConfirmation: false,
    });
  };

  executeAppDeletion = () => {
    this.setState({ isDeletingApp: true });
    appService
      .deleteApp(this.state.appToBeDeleted.id)
      // eslint-disable-next-line no-unused-vars
      .then((data) => {
        toast.info('App deleted successfully.', {
          hideProgressBar: true,
          position: 'top-center',
        });
        this.fetchApps(this.state.currentPage || 1, this.state.currentFolder.id);
        this.fetchFolders();
      })
      .catch(({ error }) => {
        toast.error('Could not delete the app.', {
          hideProgressBar: true,
          position: 'top-center',
        });
        console.log(error);
      })
      .finally(() => {
        this.cancelDeleteAppDialog();
      });
  };

  pageCount = () => {
    return this.state.currentFolder.id ? this.state.meta.folder_count : this.state.meta.total_count;
  };

  render() {
    const {
      apps,
      isLoading,
      creatingApp,
      meta,
      currentFolder,
      showAppDeletionConfirmation,
      isDeletingApp,
      isImportingApp,
    } = this.state;
    return (
      <div className="wrapper home-page">
        <ConfirmDialog
          show={showAppDeletionConfirmation}
          message={'The app and the associated data will be permanently deleted, do you want to continue?'}
          confirmButtonLoading={isDeletingApp}
          onConfirm={() => this.executeAppDeletion()}
          onCancel={() => this.cancelDeleteAppDialog()}
        />

        <Header switchDarkMode={this.props.switchDarkMode} darkMode={this.props.darkMode} />
        {!isLoading && meta.total_count === 0 && !currentFolder.id && (
          <BlankPage
            createApp={this.createApp}
            isImportingApp={isImportingApp}
            fileInput={this.fileInput}
            handleImportApp={this.handleImportApp}
          />
        )}

        {(isLoading || meta.total_count > 0) && (
          <div className="page-body homepage-body">
            <div className="container-xl">
              <div className="row">
                <div className="col-12 col-lg-3 mb-5">
                  <br />
                  <Folders
                    foldersLoading={this.state.foldersLoading}
                    totalCount={this.state.meta.total_count}
                    folders={this.state.folders}
                    currentFolder={currentFolder}
                    folderChanged={this.folderChanged}
                    foldersChanged={this.foldersChanged}
                  />
                </div>

                <div className="col-md-9">
                  <div className="w-100 mb-5">
                    <div className="row align-items-center">
                      <div className="col">
                        <h2 className="page-title px-2">
                          {currentFolder.id ? `Folder: ${currentFolder.name}` : 'All applications'}
                        </h2>
                      </div>
                      {this.canCreateApp() && (
                        <>
                          <div className="col-auto ms-auto d-print-none">
                            <div className="w-100 ">
                              <button
                                className={'btn btn-default d-none d-lg-inline mb-3'}
                                onChange={this.handleImportApp}
                              >
                                <label>
                                  {isImportingApp && (
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  )}
                                  Import
                                  <input type="file" accept=".json" ref={this.fileInput} style={{ display: 'none' }} />
                                </label>
                              </button>
                            </div>
                          </div>

                          <div className="col-auto ms-auto d-print-none">
                            <div className="w-100 ">
                              <button
                                className={`btn btn-primary d-none d-lg-inline mb-3 create-new-app-button ${
                                  creatingApp ? 'btn-loading' : ''
                                }`}
                                onClick={this.createApp}
                              >
                                Create new application
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <AppList
                      apps={apps}
                      canCreateApp={this.canCreateApp}
                      canDeleteApp={this.canDeleteApp}
                      canUpdateApp={this.canUpdateApp}
                      folders={this.state.folders}
                      foldersChanged={this.foldersChanged}
                      deleteApp={this.deleteApp}
                      cloneApp={this.cloneApp}
                      exportApp={this.exportApp}
                      meta={meta}
                      currentFolder={currentFolder}
                      isLoading={isLoading}
                      darkMode={this.props.darkMode}
                    />
                    {this.pageCount() > 10 && (
                      <Pagination
                        currentPage={meta.current_page}
                        count={this.pageCount()}
                        totalPages={meta.total_pages}
                        pageChanged={this.pageChanged}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export { HomePage };
