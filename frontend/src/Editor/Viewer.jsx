import React from 'react';
import { appService, authenticationService } from '@/_services';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Container } from './Container';
import 'react-toastify/dist/ReactToastify.css';
import { Confirm } from './Viewer/Confirm';
import {
  onComponentOptionChanged,
  onComponentOptionsChanged,
  onComponentClick,
  onQueryConfirm,
  onQueryCancel,
  onEvent,
  runQuery,
  computeComponentState,
} from '@/_helpers/appUtils';
import queryString from 'query-string';
import { DarkModeToggle } from '@/_components/DarkModeToggle';

class Viewer extends React.Component {
  constructor(props) {
    super(props);

    const deviceWindowWidth = window.screen.width - 5;
    const isMobileDevice = deviceWindowWidth < 600;

    this.state = {
      deviceWindowWidth,
      currentLayout: isMobileDevice ? 'mobile' : 'desktop',
      currentUser: authenticationService.currentUserValue,
      isLoading: true,
      users: null,
      appDefinition: { components: {} },
      currentState: {
        queries: {},
        components: {},
        globals: {
          current_user: {},
          urlparams: {},
        },
      },
    };
  }

  setStateForApp = (data) => {
    this.setState({
      app: data,
      isLoading: false,
      appDefinition: data.definition || { components: {} },
    });
  };

  setStateForContainer = (data) => {
    const currentUser = authenticationService.currentUserValue;
    let userVars = {};

    if (currentUser) {
      userVars = {
        email: currentUser.email,
        firstName: currentUser.first_name,
        lastName: currentUser.last_name,
      };
    }

    let mobileLayoutHasWidgets = false;

    if (this.state.currentLayout === 'mobile') {
      mobileLayoutHasWidgets =
        Object.keys(data.definition.components).filter(
          (componentId) => data.definition.components[componentId]['layouts']['mobile']
        ).length > 0;
    }

    this.setState(
      {
        currentSidebarTab: 2,
        currentLayout: mobileLayoutHasWidgets ? 'mobile' : 'desktop',
        canvasWidth:
          this.state.currentLayout === 'desktop'
            ? '100%'
            : mobileLayoutHasWidgets
            ? `${this.state.deviceWindowWidth}px`
            : '1292px',
        selectedComponent: null,
        currentState: {
          queries: {},
          components: {},
          globals: {
            current_user: userVars,
            urlparams: JSON.parse(JSON.stringify(queryString.parse(this.props.location.search))),
          },
        },
      },
      () => {
        computeComponentState(this, data?.definition?.components).then(() => {
          console.log('Default component state computed and set');
          this.runQueries(data.data_queries);
        });
      }
    );
  };

  runQueries = (data_queries) => {
    data_queries.forEach((query) => {
      if (query.options.runOnPageLoad) {
        runQuery(this, query.id, query.name);
      }
    });
  };

  loadApplicationBySlug = (slug) => {
    appService.getAppBySlug(slug).then((data) => {
      this.setStateForApp(data);
      this.setStateForContainer(data);
      this.setState({ isLoading: false });
    });
  };

  loadApplicationByVersion = (appId, versionId) => {
    appService.getAppByVersion(appId, versionId).then((data) => {
      this.setStateForApp(data);
      this.setStateForContainer(data);
    });
  };

  componentDidMount() {
    const slug = this.props.match.params.slug;
    const appId = this.props.match.params.id;
    const versionId = this.props.match.params.versionId;

    this.setState({ isLoading: false });
    slug ? this.loadApplicationBySlug(slug) : this.loadApplicationByVersion(appId, versionId);
  }

  componentDidUpdate(prevProps) {
    if (this.props.match.params.slug && this.props.match.params.slug !== prevProps.match.params.slug) {
      this.setState({ isLoading: true });
      this.loadApplicationBySlug(this.props.match.params.slug);
    }
  }

  getCanvasWidth = () => {
    const canvasBoundingRect = document.getElementsByClassName('canvas-area')[0].getBoundingClientRect();
    return canvasBoundingRect?.width;
  };

  render() {
    const {
      appDefinition,
      showQueryConfirmation,
      isLoading,
      currentLayout,
      deviceWindowWidth,
      defaultComponentStateComputed,
      canvasWidth,
    } = this.state;

    return (
      <div className="viewer wrapper">
        <Confirm
          show={showQueryConfirmation}
          message={'Do you want to run this query?'}
          onConfirm={(queryConfirmationData) => onQueryConfirm(this, queryConfirmationData)}
          onCancel={() => onQueryCancel(this)}
          queryConfirmationData={this.state.queryConfirmationData}
        />
        <DndProvider backend={HTML5Backend}>
          <div className="header">
            <header className="navbar navbar-expand-md navbar-light d-print-none">
              <div className="container-xl header-container">
                <h1 className="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0">
                  <a href="/">
                    <svg width="92" height="18" viewBox="0 0 92 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M14.2649 0.31843V3.08636C14.2649 3.18308 14.1841 3.26209 14.0855 3.26209H8.94222V17.8241C8.94222 17.9209 8.86139 17.9998 8.76277 17.9998H5.48942C5.39066 17.9998 5.30998 17.9208 5.30998 17.8241V3.26209H0.179443C0.0806839 3.26209 0 3.18308 0 3.08636V0.31843C0 0.221856 0.0808285 0.1427 0.179443 0.1427H14.0855C14.1841 0.1427 14.2649 0.221856 14.2649 0.31843Z"
                        fill="#4D72FA"
                      />
                      <path
                        d="M27.909 8.00549C27.5285 7.13377 26.9937 6.36401 26.319 5.71547C25.6442 5.06692 24.8276 4.54865 23.8963 4.17255C22.9613 3.79645 21.9295 3.60486 20.8239 3.60486C19.7275 3.60486 18.701 3.79645 17.7714 4.17255C16.8435 4.54865 16.0307 5.06706 15.3559 5.71547C14.6793 6.36401 14.1464 7.13377 13.7714 8.00549C13.3962 8.8772 13.2061 9.82085 13.2061 10.8084C13.2061 11.7981 13.3981 12.7416 13.7785 13.6133C14.1572 14.485 14.6902 15.255 15.3614 15.9033C16.0326 16.5517 16.8419 17.0686 17.766 17.4394C18.6903 17.8119 19.7149 18 20.8115 18C21.924 18 22.9613 17.8119 23.8946 17.4394C24.8278 17.0686 25.646 16.5517 26.3243 15.9033C27.0045 15.255 27.5411 14.487 27.9162 13.6204C28.2913 12.7523 28.4833 11.8069 28.4833 10.8085C28.4833 9.82085 28.2894 8.87706 27.909 8.00549ZM20.851 14.9454C20.2821 14.9454 19.7436 14.8417 19.252 14.6378C18.7585 14.4342 18.3224 14.1457 17.9546 13.7818C17.5885 13.4183 17.2942 12.9771 17.0806 12.4727C16.8671 11.97 16.7576 11.406 16.7576 10.7961C16.7576 10.1968 16.8672 9.6362 17.0806 9.13181C17.2942 8.62741 17.5885 8.18801 17.9546 7.82423C18.3224 7.46045 18.7585 7.17569 19.2503 6.97532C19.7438 6.77509 20.2821 6.67314 20.851 6.67314C21.411 6.67314 21.9457 6.77679 22.4427 6.9807C22.9415 7.18631 23.3795 7.47108 23.7474 7.83132C24.1135 8.19156 24.4077 8.62911 24.6213 9.13181C24.8349 9.6362 24.9426 10.1968 24.9426 10.7961C24.9426 11.406 24.8349 11.9718 24.6213 12.4798C24.4076 12.9877 24.1133 13.4305 23.7455 13.7943C23.3794 14.158 22.9434 14.4428 22.4516 14.643C21.9581 14.8436 21.4198 14.9454 20.851 14.9454Z"
                        fill="#4D72FA"
                      />
                      <path
                        d="M45.1096 8.00549C44.7309 7.13377 44.1962 6.36401 43.5195 5.71547C42.8448 5.06692 42.03 4.54865 41.0968 4.17255C40.1637 3.79645 39.13 3.60486 38.0246 3.60486C36.93 3.60486 35.9015 3.79645 34.9722 4.17255C34.0443 4.54865 33.2314 5.06706 32.5567 5.71547C31.882 6.36387 31.3488 7.13377 30.9721 8.00549C30.597 8.8772 30.4067 9.82085 30.4067 10.8084C30.4067 11.7981 30.5988 12.7416 30.9793 13.6133C31.3598 14.485 31.8926 15.255 32.5621 15.9033C33.2334 16.5517 34.0426 17.0686 34.9667 17.4394C35.8911 17.8119 36.9157 18 38.0123 18C39.1247 18 40.162 17.8119 41.0952 17.4394C42.0302 17.0686 42.8467 16.5517 43.5267 15.9033C44.2069 15.255 44.7418 14.487 45.1169 13.6204C45.4935 12.7523 45.684 11.8069 45.684 10.8085C45.684 9.82085 45.4901 8.87706 45.1096 8.00549ZM38.0515 14.9454C37.4825 14.9454 36.9443 14.8417 36.4524 14.6378C35.9589 14.4342 35.523 14.1457 35.1551 13.7818C34.789 13.4183 34.4946 12.9788 34.281 12.4727C34.0673 11.9683 33.9597 11.4041 33.9597 10.7961C33.9597 10.1968 34.0673 9.6362 34.281 9.13181C34.4946 8.62741 34.789 8.18801 35.1551 7.82423C35.523 7.46045 35.9589 7.17569 36.4507 6.97532C36.9442 6.77509 37.4825 6.67314 38.0513 6.67314C38.6112 6.67314 39.148 6.77679 39.6449 6.9807C40.1421 7.18631 40.5799 7.47108 40.9479 7.83132C41.3139 8.19156 41.6083 8.62911 41.8218 9.13181C42.0355 9.6362 42.1431 10.1968 42.1431 10.7961C42.1431 11.406 42.0355 11.9718 41.8218 12.4798C41.6083 12.9894 41.3139 13.4305 40.946 13.7943C40.5799 14.158 40.1439 14.4428 39.6522 14.643C39.1588 14.8436 38.6205 14.9454 38.0515 14.9454Z"
                        fill="#4D72FA"
                      />
                      <path
                        d="M51.9371 0.31843V17.8242C51.9371 17.9211 51.8563 18 51.7576 18H48.5628C48.4639 18 48.3833 17.9209 48.3833 17.8242V0.31843C48.3833 0.221856 48.464 0.1427 48.5628 0.1427H51.7576C51.8563 0.1427 51.9371 0.221856 51.9371 0.31843Z"
                        fill="#4D72FA"
                      />
                      <path
                        d="M62.6565 0.318207V12.0842C62.6565 13.0473 62.5093 13.9047 62.2168 14.6325C61.9224 15.3669 61.4935 15.9925 60.9424 16.4935C60.3917 16.9925 59.7099 17.3741 58.9184 17.6235C58.1358 17.8731 57.2369 17.9996 56.2463 17.9996H54.17C54.0713 17.9996 53.9907 17.9206 53.9907 17.8239V15.0558C53.9907 14.9592 54.0714 14.8801 54.17 14.8801H56.2463C57.2495 14.8801 57.9709 14.6376 58.3908 14.1579C58.8215 13.6693 59.0385 12.968 59.0385 12.0701L59.0493 0.318064C59.0493 0.22149 59.1301 0.142334 59.2287 0.142334H62.4769C62.5758 0.142476 62.6565 0.221633 62.6565 0.318207Z"
                        fill="#4D72FA"
                      />
                      <path
                        d="M79.759 8.00549C79.3785 7.13377 78.8437 6.36401 78.1673 5.71547C77.4926 5.06692 76.6778 4.54865 75.7446 4.17255C74.8114 3.79645 73.7776 3.60486 72.6722 3.60486C71.5778 3.60486 70.551 3.79645 69.6214 4.17255C68.6919 4.54865 67.8789 5.06706 67.2042 5.71547C66.5295 6.36387 65.9962 7.13377 65.6215 8.00549C65.2446 8.8772 65.0542 9.82085 65.0542 10.8084C65.0542 11.7981 65.2445 12.74 65.6215 13.6064C65.9964 14.4745 66.5295 15.2426 67.2042 15.891C67.8789 16.5376 68.6919 17.058 69.6214 17.4341C70.551 17.81 71.5776 17.9999 72.6722 17.9999C73.5822 17.9999 74.4309 17.8733 75.1937 17.6238C75.9581 17.376 76.649 17.035 77.2521 16.617C77.8549 16.1969 78.379 15.7048 78.8097 15.1582C79.2384 14.61 79.5706 14.0299 79.7948 13.4306C79.8145 13.3779 79.8073 13.3182 79.7733 13.2708C79.7392 13.2233 79.6854 13.1951 79.6261 13.1951H76.1698C76.1035 13.1951 76.0442 13.2303 76.0119 13.2866C75.7139 13.8122 75.2726 14.2446 74.6983 14.5697C74.1257 14.8967 73.4527 15.0618 72.6991 15.0618C72.2235 15.0618 71.7533 14.9809 71.3012 14.821C70.8489 14.661 70.4307 14.4326 70.0573 14.1408C69.686 13.8509 69.3629 13.4924 69.0991 13.0724C68.8714 12.712 68.7025 12.3095 68.5966 11.8738H80.0729C80.1625 11.8738 80.238 11.8087 80.2506 11.7226C80.2685 11.6015 80.2846 11.4768 80.3027 11.3482C80.3223 11.2094 80.3311 11.0336 80.3311 10.8085C80.3314 9.82085 80.1396 8.87706 79.759 8.00549ZM72.6993 6.46767C73.2019 6.46767 73.6701 6.54328 74.0901 6.69438C74.5118 6.84547 74.8941 7.05816 75.2278 7.32706C75.5615 7.59767 75.8487 7.92293 76.0819 8.29535C76.2776 8.60646 76.4337 8.9456 76.5485 9.30754H68.7045C68.8212 8.94744 68.9808 8.60816 69.1836 8.29705C69.4259 7.92463 69.7238 7.59937 70.0702 7.33046C70.4165 7.05971 70.8149 6.84717 71.2545 6.69424C71.6924 6.54315 72.1787 6.46767 72.6993 6.46767Z"
                        fill="#4D72FA"
                      />
                      <path
                        d="M92 15.2512L91.973 17.8257C91.9711 17.9225 91.8922 17.9997 91.7936 17.9997H89.2041C88.4683 17.9997 87.7648 17.9241 87.1133 17.7749C86.4476 17.6236 85.8591 17.3407 85.3673 16.9347C84.8757 16.5269 84.4808 15.9644 84.1938 15.2632C83.9102 14.5674 83.7666 13.6659 83.7666 12.5849V7.31626H81.6868C81.5879 7.31626 81.5073 7.2371 81.5073 7.14053V4.72051C81.5073 4.64136 81.5611 4.57282 81.6382 4.55172L83.7075 3.98941L84.3319 0.147693C84.3463 0.0632969 84.4215 0 84.5096 0H87.1405C87.2391 0 87.3198 0.0791563 87.3198 0.17573V4.26172H91.4527C91.5515 4.26172 91.6322 4.34087 91.6322 4.43745V7.14039C91.6322 7.23696 91.5514 7.31612 91.4527 7.31612H87.3072V12.5584C87.3072 13.0699 87.3682 13.4936 87.4866 13.8187C87.6051 14.1402 87.7612 14.3949 87.955 14.5762C88.1472 14.7571 88.3766 14.8854 88.6369 14.9574C88.9061 15.0348 89.1986 15.0733 89.5074 15.0733H91.8206C91.869 15.0733 91.9139 15.0927 91.948 15.126C91.982 15.1597 92 15.2037 92 15.2512Z"
                        fill="#4D72FA"
                      />
                    </svg>
                  </a>
                </h1>
                {this.state.app && <span>{this.state.app.name}</span>}
                <div className="d-flex align-items-center m-1 p-1">
                  <DarkModeToggle switchDarkMode={this.props.switchDarkMode} darkMode={this.props.darkMode} />
                </div>
              </div>
            </header>
          </div>
          <div className="sub-section">
            <div className="main">
              <div className="canvas-container align-items-center">
                <div
                  className="canvas-area"
                  style={{
                    width: canvasWidth,
                    maxWidth: '1292px',
                  }}
                >
                  {defaultComponentStateComputed && (
                    <>
                      {isLoading ? (
                        <div className="mx-auto mt-5 w-50 p-5">
                          <center>
                            <div className="spinner-border text-azure" role="status"></div>
                          </center>
                        </div>
                      ) : (
                        <Container
                          appDefinition={appDefinition}
                          appDefinitionChanged={() => false} // function not relevant in viewer
                          snapToGrid={true}
                          appLoading={isLoading}
                          darkMode={this.props.darkMode}
                          onEvent={(eventName, options) => onEvent(this, eventName, options, 'view')}
                          mode="view"
                          deviceWindowWidth={deviceWindowWidth}
                          currentLayout={currentLayout}
                          currentState={this.state.currentState}
                          selectedComponent={this.state.selectedComponent}
                          onComponentClick={(id, component) => {
                            this.setState({ selectedComponent: { id, component } });
                            onComponentClick(this, id, component, 'view');
                          }}
                          onComponentOptionChanged={(component, optionName, value) =>
                            onComponentOptionChanged(this, component, optionName, value)
                          }
                          onComponentOptionsChanged={(component, options) =>
                            onComponentOptionsChanged(this, component, options)
                          }
                          canvasWidth={this.getCanvasWidth()}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DndProvider>
      </div>
    );
  }
}

export { Viewer };
