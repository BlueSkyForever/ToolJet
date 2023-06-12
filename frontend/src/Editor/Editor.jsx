import React from 'react';
import { appService, authenticationService, appVersionService, orgEnvironmentVariableService } from '@/_services';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { defaults, cloneDeep, isEqual, isEmpty, debounce, omit } from 'lodash';
import { Container } from './Container';
import { EditorKeyHooks } from './EditorKeyHooks';
import { CustomDragLayer } from './CustomDragLayer';
import { LeftSidebar } from './LeftSidebar';
import { componentTypes } from './WidgetManager/components';
import { Inspector } from './Inspector/Inspector';
import QueryPanel from './QueryPanel/QueryPanel';
import {
  onComponentOptionChanged,
  onComponentOptionsChanged,
  onEvent,
  onQueryConfirmOrCancel,
  runQuery,
  setStateAsync,
  computeComponentState,
  debuggerActions,
  cloneComponents,
  removeSelectedComponent,
} from '@/_helpers/appUtils';
import { Confirm } from './Viewer/Confirm';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import CommentNotifications from './CommentNotifications';
import { WidgetManager } from './WidgetManager';
import config from 'config';
import queryString from 'query-string';
import { toast } from 'react-hot-toast';
const { produce, enablePatches, setAutoFreeze, applyPatches } = require('immer');
import { createWebsocketConnection } from '@/_helpers/websocketConnection';
import RealtimeCursors from '@/Editor/RealtimeCursors';
import { initEditorWalkThrough } from '@/_helpers/createWalkThrough';
import { EditorContextWrapper } from './Context/EditorContextWrapper';
import Selecto from 'react-selecto';
import { withTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import Skeleton from 'react-loading-skeleton';
import EditorHeader from './Header';
import { getWorkspaceId } from '@/_helpers/utils';
import '@/_styles/editor/react-select-search.scss';
import { withRouter } from '@/_hoc/withRouter';
import { ReleasedVersionError } from './AppVersionsManager/ReleasedVersionError';

import { useDataSourcesStore } from '@/_stores/dataSourcesStore';
import { useDataQueriesStore } from '@/_stores/dataQueriesStore';
import { useQueryPanelStore } from '@/_stores/queryPanelStore';
import { useAppDataStore } from '@/_stores/appDataStore';
import { resetAllStores } from '@/_stores/utils';

setAutoFreeze(false);
enablePatches();

class EditorComponent extends React.Component {
  constructor(props) {
    super(props);
    resetAllStores();

    const appId = this.props.params.id;

    const pageHandle = this.props.params.pageHandle;

    const { socket } = createWebsocketConnection(appId);

    this.renameQueryNameId = React.createRef();

    this.socket = socket;

    const defaultPageId = uuid();

    this.subscription = null;

    this.defaultDefinition = {
      showViewerNavigation: true,
      homePageId: defaultPageId,
      pages: {
        [defaultPageId]: {
          components: {},
          handle: 'home',
          name: 'Home',
        },
      },
      globalSettings: {
        hideHeader: false,
        appInMaintenance: false,
        canvasMaxWidth: 1292,
        canvasMaxWidthType: 'px',
        canvasMaxHeight: 2400,
        canvasBackgroundColor: props.darkMode ? '#2f3c4c' : '#edeff5',
        backgroundFxQuery: '',
      },
    };

    this.dataSourceModalRef = React.createRef();
    this.canvasContainerRef = React.createRef();
    this.selectionRef = React.createRef();
    this.selectionDragRef = React.createRef();
    this.queryManagerPreferences = JSON.parse(localStorage.getItem('queryManagerPreferences')) ?? {};
    this.state = {
      currentUser: {},
      app: {},
      allComponentTypes: componentTypes,
      isLoading: true,
      users: null,
      appId,
      editingVersion: null,
      showLeftSidebar: true,
      showComments: false,
      zoomLevel: 1.0,
      currentLayout: 'desktop',
      deviceWindowWidth: 450,
      appDefinition: this.defaultDefinition,
      currentState: {
        queries: {},
        components: {},
        globals: {
          theme: { name: props.darkMode ? 'dark' : 'light' },
          urlparams: JSON.parse(JSON.stringify(queryString.parse(props.location.search))),
        },
        errors: {},
        variables: {},
        client: {},
        server: {},
        page: {
          handle: pageHandle,
          variables: {},
        },
      },
      apps: [],
      queryConfirmationList: [],
      showCreateVersionModalPrompt: false,
      isSourceSelected: false,
      isSaving: false,
      isUnsavedQueriesAvailable: false,
      selectionInProgress: false,
      scrollOptions: {},
      currentPageId: defaultPageId,
      pages: {},
      draftQuery: null,
      selectedDataSource: null,
    };

    this.autoSave = debounce(this.saveEditingVersion, 3000);
    this.realtimeSave = debounce(this.appDefinitionChanged, 500);
  }

  setWindowTitle(name) {
    document.title = name ? `${name} - Tooljet` : `My App - Tooljet`;
  }

  onVersionDelete = () => {
    this.fetchApp(this.props.params.pageHandle);
  };
  getCurrentOrganizationDetails() {
    const currentSession = authenticationService.currentSessionValue;
    const currentUser = currentSession?.current_user;
    this.subscription = authenticationService.currentSession.subscribe((currentSession) => {
      if (currentUser && currentSession?.group_permissions) {
        const userVars = {
          email: currentUser.email,
          firstName: currentUser.first_name,
          lastName: currentUser.last_name,
          groups: currentSession.group_permissions?.map((group) => group.group),
        };

        this.setState({
          currentUser,
          currentState: {
            ...this.state.currentState,
            globals: {
              ...this.state.currentState.globals,
              currentUser: userVars,
            },
          },
          userVars,
        });
      }
    });
  }

  componentDidMount() {
    this.getCurrentOrganizationDetails();
    this.autoSave();
    this.fetchApps(0);
    this.fetchApp(this.props.params.pageHandle);
    this.fetchOrgEnvironmentVariables();
    this.initComponentVersioning();
    this.initRealtimeSave();
    this.initEventListeners();
    this.setState({
      currentSidebarTab: 2,
      selectedComponents: [],
      scrollOptions: {
        container: this.canvasContainerRef.current,
        throttleTime: 30,
        threshold: 0,
      },
    });
  }

  /**
   * When a new update is received over-the-websocket connection
   * the useEffect in Container.jsx is triggered, but already appDef had been updated
   * to avoid ymap observe going into a infinite loop a check is added where if the
   * current appDef is equal to the newAppDef then we do not trigger a realtimeSave
   */
  initRealtimeSave = () => {
    if (!config.ENABLE_MULTIPLAYER_EDITING) return null;

    this.props.ymap?.observe(() => {
      if (!isEqual(this.state.editingVersion?.id, this.props.ymap?.get('appDef').editingVersionId)) return;
      if (isEqual(this.state.appDefinition, this.props.ymap?.get('appDef').newDefinition)) return;

      this.realtimeSave(this.props.ymap?.get('appDef').newDefinition, { skipAutoSave: true, skipYmapUpdate: true });
    });
  };

  fetchOrgEnvironmentVariables = () => {
    orgEnvironmentVariableService.getVariables().then((data) => {
      const client_variables = {};
      const server_variables = {};
      data.variables.map((variable) => {
        if (variable.variable_type === 'server') {
          server_variables[variable.variable_name] = 'HiddenEnvironmentVariable';
        } else {
          client_variables[variable.variable_name] = variable.value;
        }
      });
      this.setState({
        currentState: {
          ...this.state.currentState,
          server: server_variables,
          client: client_variables,
        },
      });
    });
  };

  componentDidUpdate(prevProps, prevState) {
    if (!isEqual(prevState.appDefinition, this.state.appDefinition)) {
      computeComponentState(this, this.state.appDefinition.pages[this.state.currentPageId]?.components);
    }

    if (!isEqual(prevState.editorMarginLeft, this.state.editorMarginLeft)) {
      this.canvasContainerRef.current.scrollLeft += this.state.editorMarginLeft;
    }

    if (
      !isEqual(prevState.isQueryPaneDragging, this.state.isQueryPaneDragging) ||
      !isEqual(prevState.isQueryPaneExpanded, this.state.isQueryPaneExpanded)
    ) {
      this.setState({ queryPanelHeight: useQueryPanelStore.getState().queryPanelHeight });
    }
  }

  isVersionReleased = (version = this.state.editingVersion) => {
    if (isEmpty(version)) {
      return false;
    }
    return this.state.app.current_version_id === version.id;
  };

  closeCreateVersionModalPrompt = () => {
    this.setState({ isSaving: false, showCreateVersionModalPrompt: false });
  };

  initEventListeners() {
    this.socket?.addEventListener('message', (event) => {
      const data = event.data.replace(/^"(.+(?="$))"$/, '$1');
      if (data === 'versionReleased') this.fetchApp();
      else if (data === 'dataQueriesChanged') {
        this.fetchDataQueries(this.state.editingVersion?.id);
      } else if (data === 'dataSourcesChanged') {
        this.fetchDataSources(this.state.editingVersion?.id);
      }
    });
  }

  componentWillUnmount() {
    document.title = 'Tooljet - Dashboard';
    this.socket && this.socket?.close();
    this.subscription && this.subscription.unsubscribe();
    if (config.ENABLE_MULTIPLAYER_EDITING) this.props?.provider?.disconnect();
  }

  // 1. When we receive an undoable action – we can always undo but cannot redo anymore.
  // 2. Whenever you perform an undo – you can always redo and keep doing undo as long as we have a patch for it.
  // 3. Whenever you redo – you can always undo and keep doing redo as long as we have a patch for it.
  initComponentVersioning = () => {
    this.currentVersion = {
      [this.state.currentPageId]: -1,
    };
    this.currentVersionChanges = {};
    this.noOfVersionsSupported = 100;
    this.canUndo = false;
    this.canRedo = false;
  };

  fetchDataSources = (id) => {
    useDataSourcesStore.getState().actions.fetchDataSources(id);
  };

  fetchGlobalDataSources = () => {
    const { current_organization_id: organizationId } = this.state.currentUser;
    useDataSourcesStore.getState().actions.fetchGlobalDataSources(organizationId);
  };

  fetchDataQueries = (id, selectFirstQuery = false, runQueriesOnAppLoad = false) => {
    useDataQueriesStore.getState().actions.fetchDataQueries(id, selectFirstQuery, runQueriesOnAppLoad, this);
  };

  toggleAppMaintenance = () => {
    const newState = !this.state.app.is_maintenance_on;

    // eslint-disable-next-line no-unused-vars
    appService.setMaintenance(this.state.app.id, newState).then((data) => {
      this.setState({
        app: {
          ...this.state.app,
          is_maintenance_on: newState,
        },
      });

      if (newState) {
        toast.success('Application is on maintenance.');
      } else {
        toast.success('Application maintenance is completed');
      }
    });
  };

  fetchApps = (page) => {
    appService.getAll(page).then((data) =>
      this.setState({
        apps: data.apps,
      })
    );
  };

  fetchApp = (startingPageHandle) => {
    const appId = this.props.params.id;

    const callBack = async (data) => {
      let dataDefinition = defaults(data.definition, this.defaultDefinition);

      const pages = Object.entries(dataDefinition.pages).map(([pageId, page]) => ({ id: pageId, ...page }));
      const startingPageId = pages.filter((page) => page.handle === startingPageHandle)[0]?.id;
      const homePageId = startingPageId ?? dataDefinition.homePageId;

      useAppDataStore.getState().actions.updateEditingVersion(data.editing_version);

      this.setState(
        {
          app: data,
          isLoading: false,
          editingVersion: data.editing_version,
          appDefinition: dataDefinition,
          slug: data.slug,
          currentPageId: homePageId,
          currentState: {
            ...this.state.currentState,
            page: {
              handle: dataDefinition.pages[homePageId]?.handle,
              name: dataDefinition.pages[homePageId]?.name,
              id: homePageId,
              variables: {},
            },
          },
        },
        async () => {
          computeComponentState(this, this.state.appDefinition.pages[homePageId]?.components ?? {}).then(async () => {
            this.setWindowTitle(data.name);
            this.setState({
              showComments: !!queryString.parse(this.props.location.search).threadId,
            });
            for (const event of dataDefinition.pages[homePageId]?.events ?? []) {
              await this.handleEvent(event.eventId, event);
            }
          });
        }
      );

      this.fetchDataSources(data.editing_version?.id);
      this.fetchDataQueries(data.editing_version?.id, true, true);
      this.fetchGlobalDataSources();
      initEditorWalkThrough();
    };

    this.setState(
      {
        isLoading: true,
      },
      () => {
        appService.getApp(appId).then(callBack);
      }
    );
  };

  setAppDefinitionFromVersion = (version, shouldWeEditVersion = true) => {
    if (version?.id !== this.state.editingVersion?.id) {
      this.appDefinitionChanged(defaults(version.definition, this.defaultDefinition), {
        skipAutoSave: true,
        skipYmapUpdate: true,
        versionChanged: true,
      });
      if (version?.id === this.state.app?.current_version_id) {
        (this.canUndo = false), (this.canRedo = false);
      }
      useAppDataStore.getState().actions.updateEditingVersion(version);

      this.setState(
        {
          editingVersion: version,
          isSaving: false,
        },
        () => {
          shouldWeEditVersion && this.saveEditingVersion(true);
          this.fetchDataSources(this.state.editingVersion?.id);
          this.fetchDataQueries(this.state.editingVersion?.id, true);
          this.initComponentVersioning();
        }
      );
    }
  };

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
   */
  dataSourcesChanged = () => {
    if (this.socket instanceof WebSocket && this.socket?.readyState === WebSocket.OPEN) {
      this.socket?.send(
        JSON.stringify({
          event: 'events',
          data: { message: 'dataSourcesChanged', appId: this.state.appId },
        })
      );
    } else {
      this.fetchDataSources(this.state.editingVersion?.id);
    }
  };

  globalDataSourcesChanged = () => {
    this.fetchGlobalDataSources();
  };

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
   */
  dataQueriesChanged = () => {
    if (this.socket instanceof WebSocket && this.socket?.readyState === WebSocket.OPEN) {
      this.socket?.send(
        JSON.stringify({
          event: 'events',
          data: { message: 'dataQueriesChanged', appId: this.state.appId },
        })
      );
    } else {
      this.fetchDataQueries(this.state.editingVersion?.id);
    }
  };

  switchSidebarTab = (tabIndex) => {
    this.setState({
      currentSidebarTab: tabIndex,
    });
  };

  filterComponents = (event) => {
    const searchText = event.currentTarget.value;
    let filteredComponents = this.state.allComponentTypes;

    if (searchText !== '') {
      filteredComponents = this.state.allComponentTypes.filter(
        (e) => e.name.toLowerCase() === searchText.toLowerCase()
      );
    }

    this.setState({ componentTypes: filteredComponents });
  };

  handleAddPatch = (patches, inversePatches) => {
    if (isEmpty(patches) && isEmpty(inversePatches)) return;
    if (isEqual(patches, inversePatches)) return;

    const currentPage = this.state.currentPageId;
    const currentVersion = this.currentVersion[currentPage] ?? -1;

    this.currentVersionChanges[currentPage] = this.currentVersionChanges[currentPage] ?? {};

    this.currentVersionChanges[currentPage][currentVersion] = {
      redo: patches,
      undo: inversePatches,
    };

    this.canUndo = this.currentVersionChanges[currentPage].hasOwnProperty(currentVersion);
    this.canRedo = this.currentVersionChanges[currentPage].hasOwnProperty(currentVersion + 1);

    this.currentVersion[currentPage] = currentVersion + 1;

    delete this.currentVersionChanges[currentPage][currentVersion + 1];
    delete this.currentVersionChanges[currentPage][currentVersion - this.noOfVersionsSupported];
  };

  handleUndo = () => {
    if (this.canUndo) {
      let currentVersion = this.currentVersion[this.state.currentPageId];

      const appDefinition = applyPatches(
        this.state.appDefinition,
        this.currentVersionChanges[this.state.currentPageId][currentVersion - 1].undo
      );

      this.canUndo = this.currentVersionChanges[this.state.currentPageId].hasOwnProperty(currentVersion - 1);
      this.canRedo = true;
      this.currentVersion[this.state.currentPageId] = currentVersion - 1;

      if (!appDefinition) return;
      this.setState(
        {
          appDefinition,
          isSaving: true,
        },
        () => {
          this.props.ymap?.set('appDef', {
            newDefinition: appDefinition,
            editingVersionId: this.state.editingVersion?.id,
          });

          this.autoSave();
        }
      );
    }
  };

  handleRedo = () => {
    if (this.canRedo) {
      let currentVersion = this.currentVersion[this.state.currentPageId];

      const appDefinition = applyPatches(
        this.state.appDefinition,
        this.currentVersionChanges[this.state.currentPageId][currentVersion].redo
      );

      this.canUndo = true;
      this.canRedo = this.currentVersionChanges[this.state.currentPageId].hasOwnProperty(currentVersion + 1);
      this.currentVersion[this.state.currentPageId] = currentVersion + 1;

      if (!appDefinition) return;
      this.setState(
        {
          appDefinition,
          isSaving: true,
        },
        () => {
          this.props.ymap?.set('appDef', {
            newDefinition: appDefinition,
            editingVersionId: this.state.editingVersion?.id,
          });

          this.autoSave();
        }
      );
    }
  };

  appDefinitionChanged = (newDefinition, opts = {}) => {
    let currentPageId = this.state.currentPageId;
    if (isEqual(this.state.appDefinition, newDefinition)) return;
    if (config.ENABLE_MULTIPLAYER_EDITING && !opts.skipYmapUpdate) {
      this.props.ymap?.set('appDef', { newDefinition, editingVersionId: this.state.editingVersion?.id });
    }

    if (opts?.versionChanged) {
      currentPageId = newDefinition.homePageId;

      this.setState(
        {
          isSaving: true,
          currentPageId: currentPageId,
          appDefinition: newDefinition,
          appDefinitionLocalVersion: uuid(),
        },
        () => {
          if (!opts.skipAutoSave) this.autoSave();
          this.switchPage(currentPageId);
        }
      );
      return;
    }

    produce(
      this.state.appDefinition,
      (draft) => {
        draft.pages[currentPageId].components = newDefinition.pages[currentPageId]?.components ?? {};
      },
      this.handleAddPatch
    );
    this.setState({ isSaving: true, appDefinition: newDefinition, appDefinitionLocalVersion: uuid() }, () => {
      if (!opts.skipAutoSave) this.autoSave();
    });
  };

  handleInspectorView = () => {
    this.switchSidebarTab(2);
  };

  handleSlugChange = (newSlug) => {
    this.setState({ slug: newSlug });
  };

  removeComponents = () => {
    if (!this.isVersionReleased() && this.state?.selectedComponents?.length > 1) {
      let newDefinition = cloneDeep(this.state.appDefinition);
      const selectedComponents = this.state?.selectedComponents;

      removeSelectedComponent(this.state.currentPageId, newDefinition, selectedComponents);
      const platform = navigator?.userAgentData?.platform || navigator?.platform || 'unknown';
      if (platform.toLowerCase().indexOf('mac') > -1) {
        toast('Selected components deleted! (⌘ + Z to undo)', {
          icon: '🗑️',
        });
      } else {
        toast('Selected components deleted! (ctrl + Z to undo)', {
          icon: '🗑️',
        });
      }
      this.appDefinitionChanged(newDefinition, {
        skipAutoSave: this.isVersionReleased(),
      });
      this.handleInspectorView();
    } else if (this.isVersionReleased()) {
      this.setReleasedVersionPopupState();
    }
  };

  removeComponent = (component) => {
    const currentPageId = this.state.currentPageId;
    if (!this.isVersionReleased()) {
      let newDefinition = cloneDeep(this.state.appDefinition);
      // Delete child components when parent is deleted

      let childComponents = [];

      if (newDefinition.pages[currentPageId].components?.[component.id].component.component === 'Tabs') {
        childComponents = Object.keys(newDefinition.pages[currentPageId].components).filter((key) =>
          newDefinition.pages[currentPageId].components[key].parent?.startsWith(component.id)
        );
      } else {
        childComponents = Object.keys(newDefinition.pages[currentPageId].components).filter(
          (key) => newDefinition.pages[currentPageId].components[key].parent === component.id
        );
      }

      childComponents.forEach((componentId) => {
        delete newDefinition.pages[currentPageId].components[componentId];
      });

      delete newDefinition.pages[currentPageId].components[component.id];
      const platform = navigator?.userAgentData?.platform || navigator?.platform || 'unknown';
      if (platform.toLowerCase().indexOf('mac') > -1) {
        toast('Component deleted! (⌘ + Z to undo)', {
          icon: '🗑️',
        });
      } else {
        toast('Component deleted! (ctrl + Z to undo)', {
          icon: '🗑️',
        });
      }
      this.appDefinitionChanged(newDefinition, {
        skipAutoSave: this.isVersionReleased(),
      });
      this.handleInspectorView();
    } else {
      this.setState({ isUserEditingTheVersion: true });
    }
  };

  componentDefinitionChanged = (componentDefinition) => {
    if (this.isVersionReleased()) {
      this.setReleasedVersionPopupState();
      return;
    }
    let _self = this;
    const currentPageId = this.state.currentPageId;

    if (this.state.appDefinition?.pages[currentPageId].components[componentDefinition.id]) {
      const newDefinition = {
        appDefinition: produce(this.state.appDefinition, (draft) => {
          draft.pages[currentPageId].components[componentDefinition.id].component = componentDefinition.component;
        }),
      };

      produce(
        this.state.appDefinition,
        (draft) => {
          draft.pages[currentPageId].components[componentDefinition.id].component = componentDefinition.component;
        },
        this.handleAddPatch
      );
      setStateAsync(_self, newDefinition).then(() => {
        computeComponentState(_self, _self.state.appDefinition.pages[currentPageId].components);
        this.setState({ isSaving: true, appDefinitionLocalVersion: uuid() });
        this.autoSave();
        this.props.ymap?.set('appDef', {
          newDefinition: newDefinition.appDefinition,
          editingVersionId: this.state.editingVersion?.id,
        });
      });
    }
  };

  setReleasedVersionPopupState = () => {
    this.setState({ isUserEditingTheVersion: true });
  };

  handleEditorEscapeKeyPress = () => {
    if (this.state?.selectedComponents?.length > 0) {
      this.setState({ selectedComponents: [] });
      this.handleInspectorView();
    }
  };

  moveComponents = (direction) => {
    let appDefinition = JSON.parse(JSON.stringify(this.state.appDefinition));
    let newComponents = appDefinition.pages[this.state.currentPageId].components;

    for (const selectedComponent of this.state.selectedComponents) {
      newComponents = produce(newComponents, (draft) => {
        let top = draft[selectedComponent.id].layouts[this.state.currentLayout].top;
        let left = draft[selectedComponent.id].layouts[this.state.currentLayout].left;

        const gridWidth = (1 * 100) / 43; // width of the canvas grid in percentage

        switch (direction) {
          case 'ArrowLeft':
            left = left - gridWidth;
            break;
          case 'ArrowRight':
            left = left + gridWidth;
            break;
          case 'ArrowDown':
            top = top + 10;
            break;
          case 'ArrowUp':
            top = top - 10;
            break;
        }

        draft[selectedComponent.id].layouts[this.state.currentLayout].top = top;
        draft[selectedComponent.id].layouts[this.state.currentLayout].left = left;
      });
    }
    appDefinition.pages[this.state.currentPageId].components = newComponents;
    this.appDefinitionChanged(appDefinition);
  };

  cutComponents = () => {
    if (this.isVersionReleased()) {
      this.setReleasedVersionPopupState();
      return;
    }
    cloneComponents(this, this.appDefinitionChanged, false, true);
  };

  copyComponents = () => cloneComponents(this, this.appDefinitionChanged, false);

  cloneComponents = () => {
    if (this.isVersionReleased()) {
      this.setReleasedVersionPopupState();
      return;
    }
    cloneComponents(this, this.appDefinitionChanged, true);
  };

  decimalToHex = (alpha) => (alpha === 0 ? '00' : Math.round(255 * alpha).toString(16));

  globalSettingsChanged = (key, value) => {
    const appDefinition = { ...this.state.appDefinition };
    if (value?.[1]?.a == undefined) appDefinition.globalSettings[key] = value;
    else {
      const hexCode = `${value?.[0]}${this.decimalToHex(value?.[1]?.a)}`;
      appDefinition.globalSettings[key] = hexCode;
    }
    this.setState(
      {
        isSaving: true,
        appDefinition,
      },
      () => {
        this.props.ymap?.set('appDef', {
          newDefinition: appDefinition,
          editingVersionId: this.state.editingVersion?.id,
        });
        this.autoSave();
      }
    );
  };

  onNameChanged = (newName) => {
    this.setState({
      app: { ...this.state.app, name: newName },
    });
    this.setWindowTitle(newName);
  };

  toggleComments = () => {
    this.setState({ showComments: !this.state.showComments });
  };

  setSelectedComponent = (id, component, multiSelect = false) => {
    if (this.state.selectedComponents.length === 0 || !multiSelect) {
      this.switchSidebarTab(1);
    } else {
      this.switchSidebarTab(2);
    }

    const isAlreadySelected = this.state.selectedComponents.find((component) => component.id === id);

    if (!isAlreadySelected) {
      this.setState((prevState) => {
        return {
          selectedComponents: [...(multiSelect ? prevState.selectedComponents : []), { id, component }],
        };
      });
    }
  };

  onVersionRelease = (versionId) => {
    this.setState(
      {
        app: {
          ...this.state.app,
          current_version_id: versionId,
        },
      },
      () => {
        this.socket.send(
          JSON.stringify({
            event: 'events',
            data: { message: 'versionReleased', appId: this.state.appId },
          })
        );
      }
    );
  };

  onZoomChanged = (zoom) => {
    this.setState({
      zoomLevel: zoom,
    });
  };

  getCanvasWidth = () => {
    const canvasBoundingRect = document.getElementsByClassName('canvas-area')[0].getBoundingClientRect();
    return canvasBoundingRect?.width;
  };

  getCanvasHeight = () => {
    const canvasBoundingRect = document.getElementsByClassName('canvas-area')[0].getBoundingClientRect();
    return canvasBoundingRect?.height;
  };

  computeCanvasBackgroundColor = () => {
    const { canvasBackgroundColor } = this.state.appDefinition?.globalSettings ?? '#edeff5';
    if (['#2f3c4c', '#edeff5'].includes(canvasBackgroundColor)) {
      return this.props.darkMode ? '#2f3c4c' : '#edeff5';
    }
    return canvasBackgroundColor;
  };

  computeCanvasContainerHeight = () => {
    // 45 = (height of header)
    // 85 = (the height of the query panel header when minimised) + (height of header)
    return `calc(${100}% - ${Math.max(this.state.queryPanelHeight + 45, 85)}px)`;
  };

  handleQueryPaneDragging = (isQueryPaneDragging) => this.setState({ isQueryPaneDragging });
  handleQueryPaneExpanding = (isQueryPaneExpanded) => this.setState({ isQueryPaneExpanded });

  saveEditingVersion = (isUserSwitchedVersion = false) => {
    if (this.isVersionReleased() && !isUserSwitchedVersion) {
      this.setState({ isSaving: false });
    } else if (!isEmpty(this.state.editingVersion)) {
      appVersionService
        .save(
          this.state.appId,
          this.state.editingVersion.id,
          { definition: this.state.appDefinition },
          isUserSwitchedVersion
        )
        .then(() => {
          this.setState(
            {
              saveError: false,
              editingVersion: {
                ...this.state.editingVersion,
                ...{ definition: this.state.appDefinition },
              },
            },
            () => {
              this.setState({
                isSaving: false,
              });
            }
          );
        })
        .catch(() => {
          this.setState({ saveError: true, isSaving: false }, () => {
            toast.error('App could not save.');
          });
        });
    }
  };

  handleOnComponentOptionChanged = (component, optionName, value) => {
    return onComponentOptionChanged(this, component, optionName, value);
  };

  handleOnComponentOptionsChanged = (component, options) => {
    return onComponentOptionsChanged(this, component, options);
  };

  handleComponentClick = (id, component) => {
    this.setState({
      selectedComponent: { id, component },
    });
    this.switchSidebarTab(1);
  };

  handleComponentHover = (id) => {
    if (this.state.selectionInProgress) return;
    this.setState({
      hoveredComponent: id,
    });
  };

  sideBarDebugger = {
    error: (data) => {
      debuggerActions.error(this, data);
    },
    flush: () => {
      debuggerActions.flush(this);
    },
    generateErrorLogs: (errors) => debuggerActions.generateErrorLogs(errors),
  };

  changeDarkMode = (newMode) => {
    this.setState({
      currentState: {
        ...this.state.currentState,
        globals: {
          ...this.state.currentState.globals,
          theme: { name: newMode ? 'dark' : 'light' },
        },
      },
    });
    this.props.switchDarkMode(newMode);
  };

  handleEvent = (eventName, options) => onEvent(this, eventName, options, 'edit');

  runQuery = (queryId, queryName) => runQuery(this, queryId, queryName);

  dataSourceModalHandler = () => {
    this.dataSourceModalRef.current.dataSourceModalToggleStateHandler();
  };

  onAreaSelectionStart = (e) => {
    const isMultiSelect = e.inputEvent.shiftKey || this.state.selectedComponents.length > 0;
    this.setState((prevState) => {
      return {
        selectionInProgress: true,
        selectedComponents: [...(isMultiSelect ? prevState.selectedComponents : [])],
      };
    });
  };

  onAreaSelection = (e) => {
    e.added.forEach((el) => {
      el.classList.add('resizer-select');
    });
    if (this.state.selectionInProgress) {
      e.removed.forEach((el) => {
        el.classList.remove('resizer-select');
      });
    }
  };

  onAreaSelectionEnd = (e) => {
    const currentPageId = this.state.currentPageId;
    this.setState({ selectionInProgress: false });
    e.selected.forEach((el, index) => {
      const id = el.getAttribute('widgetid');
      const component = this.state.appDefinition.pages[currentPageId].components[id].component;
      const isMultiSelect = e.inputEvent.shiftKey || (!e.isClick && index != 0);
      this.setSelectedComponent(id, component, isMultiSelect);
    });
  };

  onAreaSelectionDragStart = (e) => {
    if (e.inputEvent.target.getAttribute('id') !== 'real-canvas') {
      this.selectionDragRef.current = true;
    } else {
      this.selectionDragRef.current = false;
    }
  };

  onAreaSelectionDrag = (e) => {
    if (this.selectionDragRef.current) {
      e.stop();
      this.state.selectionInProgress && this.setState({ selectionInProgress: false });
    }
  };

  onAreaSelectionDragEnd = () => {
    this.selectionDragRef.current = false;
    this.state.selectionInProgress && this.setState({ selectionInProgress: false });
  };

  addNewPage = ({ name, handle }) => {
    // check for unique page handles
    const pageExists = Object.values(this.state.appDefinition.pages).some((page) => page.handle === handle);

    if (pageExists) {
      toast.error('Page with same handle already exists');
      return;
    }

    const newAppDefinition = {
      ...this.state.appDefinition,
      pages: {
        ...this.state.appDefinition.pages,
        [uuid()]: {
          name,
          handle,
          components: {},
        },
      },
    };

    this.setState(
      {
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        const newPageId = cloneDeep(Object.keys(newAppDefinition.pages)).pop();
        this.switchPage(newPageId);
        this.autoSave();
      }
    );
  };

  deletePageRequest = (pageId, isHomePage = false, pageName = '') => {
    this.setState({
      showPageDeletionConfirmation: {
        isOpen: true,
        pageId,
        isHomePage,
        pageName,
      },
    });
  };

  cancelDeletePageRequest = () => {
    this.setState({
      showPageDeletionConfirmation: {
        isOpen: false,
        pageId: null,
        isHomePage: false,
        pageName: null,
      },
    });
  };

  executeDeletepageRequest = () => {
    const pageId = this.state.showPageDeletionConfirmation.pageId;
    const isHomePage = this.state.showPageDeletionConfirmation.isHomePage;
    if (Object.keys(this.state.appDefinition.pages).length === 1) {
      toast.error('You cannot delete the only page in your app.');
      return;
    }

    this.setState({
      isDeletingPage: true,
    });

    const toBeDeletedPage = this.state.appDefinition.pages[pageId];

    const newAppDefinition = {
      ...this.state.appDefinition,
      pages: omit(this.state.appDefinition.pages, pageId),
    };

    const newCurrentPageId = isHomePage
      ? Object.keys(this.state.appDefinition.pages)[0]
      : this.state.appDefinition.homePageId;

    this.setState(
      {
        currentPageId: newCurrentPageId,
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
        isDeletingPage: false,
      },
      () => {
        toast.success(`${toBeDeletedPage.name} page deleted.`);

        this.switchPage(newCurrentPageId);
        this.autoSave();
      }
    );
  };

  updateHomePage = (pageId) => {
    this.setState(
      {
        isSaving: true,
        appDefinition: {
          ...this.state.appDefinition,
          homePageId: pageId,
        },
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        this.autoSave();
      }
    );
  };

  clonePage = (pageId) => {
    const currentPage = this.state.appDefinition.pages[pageId];
    const newPageId = uuid();
    let newPageName = `${currentPage.name} (copy)`;
    let newPageHandle = `${currentPage.handle}-copy`;
    let i = 1;
    while (Object.values(this.state.appDefinition.pages).some((page) => page.handle === newPageHandle)) {
      newPageName = `${currentPage.name} (copy ${i})`;
      newPageHandle = `${currentPage.handle}-copy-${i}`;
      i++;
    }

    const newPage = {
      ...cloneDeep(currentPage),
      name: newPageName,
      handle: newPageHandle,
    };

    const newAppDefinition = {
      ...this.state.appDefinition,
      pages: {
        ...this.state.appDefinition.pages,
        [newPageId]: newPage,
      },
    };

    this.setState(
      {
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        this.autoSave();
      }
    );
  };

  updatePageHandle = (pageId, newHandle) => {
    const pageExists = Object.values(this.state.appDefinition.pages).some((page) => page.handle === newHandle);

    if (pageExists) {
      toast.error('Page with same handle already exists');
      return;
    }

    if (newHandle.trim().length === 0) {
      toast.error('Page handle cannot be empty');
      return;
    }

    this.setState(
      {
        isSaving: true,
        appDefinition: {
          ...this.state.appDefinition,
          pages: {
            ...this.state.appDefinition.pages,
            [pageId]: {
              ...this.state.appDefinition.pages[pageId],
              handle: newHandle,
            },
          },
        },
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        toast.success('Page handle updated successfully');
        this.switchPage(pageId);
        this.autoSave();
      }
    );
  };

  updateOnPageLoadEvents = (pageId, events) => {
    this.setState(
      {
        isSaving: true,
        appDefinition: {
          ...this.state.appDefinition,
          pages: {
            ...this.state.appDefinition.pages,
            [pageId]: {
              ...this.state.appDefinition.pages[pageId],
              events,
            },
          },
        },
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        this.autoSave();
      }
    );
  };

  showHideViewerNavigation = () => {
    const newAppDefinition = {
      ...this.state.appDefinition,
      showViewerNavigation: !this.state.appDefinition.showViewerNavigation,
    };

    this.setState(
      {
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
      },
      () => this.autoSave()
    );
  };

  renamePage = (pageId, newName) => {
    if (newName.trim().length === 0) {
      toast.error('Page name cannot be empty');
      return;
    }

    const newAppDefinition = {
      ...this.state.appDefinition,
      pages: {
        ...this.state.appDefinition.pages,
        [pageId]: {
          ...this.state.appDefinition.pages[pageId],
          name: newName,
        },
      },
    };

    this.setState(
      {
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        this.autoSave();
      }
    );
  };

  hidePage = (pageId) => {
    const newAppDefinition = {
      ...this.state.appDefinition,
      pages: {
        ...this.state.appDefinition.pages,
        [pageId]: {
          ...this.state.appDefinition.pages[pageId],
          hidden: true,
        },
      },
    };

    this.setState(
      {
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        this.autoSave();
      }
    );
  };

  unHidePage = (pageId) => {
    const newAppDefinition = {
      ...this.state.appDefinition,
      pages: {
        ...this.state.appDefinition.pages,
        [pageId]: {
          ...this.state.appDefinition.pages[pageId],
          hidden: false,
        },
      },
    };

    this.setState(
      {
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        this.autoSave();
      }
    );
  };

  switchPage = (pageId, queryParams = []) => {
    document.getElementById('real-canvas').scrollIntoView();
    if (this.state.currentPageId === pageId) return;

    const { name, handle, events } = this.state.appDefinition.pages[pageId];
    const currentPageId = this.state.currentPageId;

    if (!name || !handle) return;

    const queryParamsString = queryParams.map(([key, value]) => `${key}=${value}`).join('&');

    this.props.navigate(`/${getWorkspaceId()}/apps/${this.state.appId}/${handle}?${queryParamsString}`);

    const { globals: existingGlobals } = this.state.currentState;

    const page = {
      id: pageId,
      name,
      handle,
      variables: this.state.pages?.[pageId]?.variables ?? {},
    };

    const globals = {
      ...existingGlobals,
      urlparams: JSON.parse(JSON.stringify(queryString.parse(queryParamsString))),
    };

    this.setState(
      {
        pages: {
          ...this.state.pages,
          [currentPageId]: {
            ...(this.state.pages?.[currentPageId] ?? {}),
            variables: {
              ...(this.state.currentState?.page?.variables ?? {}),
            },
          },
        },
        currentState: {
          ...this.state.currentState,
          globals,
          page,
        },
        currentPageId: pageId,
      },
      () => {
        computeComponentState(this, this.state.appDefinition.pages[pageId]?.components ?? {}).then(async () => {
          for (const event of events ?? []) {
            await this.handleEvent(event.eventId, event);
          }
        });
      }
    );
  };

  updateOnSortingPages = (newSortedPages) => {
    const pagesObj = newSortedPages.reduce((acc, page) => {
      acc[page.id] = this.state.appDefinition.pages[page.id];
      return acc;
    }, {});

    const newAppDefinition = {
      ...this.state.appDefinition,
      pages: pagesObj,
    };

    this.setState(
      {
        isSaving: true,
        appDefinition: newAppDefinition,
        appDefinitionLocalVersion: uuid(),
      },
      () => {
        this.autoSave();
      }
    );
  };

  getPagesWithIds = () => {
    return Object.entries(this.state.appDefinition.pages).map(([id, page]) => ({ ...page, id }));
  };

  toggleCurrentLayout = (selectedLayout) => {
    this.setState({
      currentLayout: selectedLayout,
    });
  };

  getCanvasMinWidth = () => {
    /**
     * minWidth will be min(default canvas min width, user set max width). Done to avoid conflict between two
     * default canvas min width = calc((total view width - width component editor side bar) - width of editor sidebar on left)
     **/
    const defaultCanvasMinWidth = `calc((100vw - 300px) - 48px)`;
    const canvasMaxWidthType = this.state.appDefinition.globalSettings.canvasMaxWidthType || 'px';
    const canvasMaxWidth = this.state.appDefinition.globalSettings.canvasMaxWidth;
    const currentLayout = this.state.currentLayout;

    const userSetMaxWidth = currentLayout === 'desktop' ? `${+canvasMaxWidth + canvasMaxWidthType}` : '450px';

    if (this.state.appDefinition.globalSettings.canvasMaxWidth && canvasMaxWidthType !== '%') {
      return `min(${defaultCanvasMinWidth}, ${userSetMaxWidth})`;
    } else {
      return defaultCanvasMinWidth;
    }
  };
  handleEditorMarginLeftChange = (value) => this.setState({ editorMarginLeft: value });

  render() {
    const {
      currentSidebarTab,
      selectedComponents = [],
      appDefinition,
      appId,
      slug,
      app,
      showLeftSidebar,
      currentState,
      isLoading,
      zoomLevel,
      currentLayout,
      deviceWindowWidth,
      apps,
      defaultComponentStateComputed,
      showComments,
      editingVersion,
      showCreateVersionModalPrompt,
      hoveredComponent,
      queryConfirmationList,
    } = this.state;

    const appVersionPreviewLink = editingVersion
      ? `/applications/${app.id}/versions/${editingVersion.id}/${this.state.currentState.page.handle}`
      : '';

    return (
      <div className="editor wrapper">
        <Confirm
          show={queryConfirmationList.length > 0}
          message={`Do you want to run this query - ${queryConfirmationList[0]?.queryName}?`}
          onConfirm={(queryConfirmationData) => onQueryConfirmOrCancel(this, queryConfirmationData, true)}
          onCancel={() => onQueryConfirmOrCancel(this, queryConfirmationList[0])}
          queryConfirmationData={queryConfirmationList[0]}
          darkMode={this.props.darkMode}
          key={queryConfirmationList[0]?.queryName}
        />
        <Confirm
          show={this.state.showPageDeletionConfirmation?.isOpen ?? false}
          title={'Delete Page'}
          message={`Do you really want to delete ${this.state.showPageDeletionConfirmation?.pageName || 'this'} page?`}
          confirmButtonLoading={this.state.isDeletingPage}
          onConfirm={() => this.executeDeletepageRequest()}
          onCancel={() => this.cancelDeletePageRequest()}
          darkMode={this.props.darkMode}
        />
        {this.isVersionReleased() && (
          <ReleasedVersionError
            isUserEditingTheVersion={this.state.isUserEditingTheVersion}
            changeBackTheState={() => {
              this.state.isUserEditingTheVersion &&
                this.setState({
                  isUserEditingTheVersion: false,
                });
            }}
          />
        )}
        <EditorContextWrapper>
          <EditorHeader
            darkMode={this.props.darkMode}
            currentState={currentState}
            currentLayout={this.state.currentLayout}
            globalSettingsChanged={this.globalSettingsChanged}
            appDefinition={appDefinition}
            toggleAppMaintenance={this.toggleAppMaintenance}
            editingVersion={editingVersion}
            showCreateVersionModalPrompt={showCreateVersionModalPrompt}
            app={app}
            appVersionPreviewLink={appVersionPreviewLink}
            slug={slug}
            appId={appId}
            canUndo={this.canUndo}
            canRedo={this.canRedo}
            handleUndo={this.handleUndo}
            handleRedo={this.handleRedo}
            toggleCurrentLayout={this.toggleCurrentLayout}
            isSaving={this.state.isSaving}
            saveError={this.state.saveError}
            isVersionReleased={this.isVersionReleased}
            onNameChanged={this.onNameChanged}
            setAppDefinitionFromVersion={this.setAppDefinitionFromVersion}
            closeCreateVersionModalPrompt={this.closeCreateVersionModalPrompt}
            handleSlugChange={this.handleSlugChange}
            onVersionRelease={this.onVersionRelease}
            saveEditingVersion={this.saveEditingVersion}
            onVersionDelete={this.onVersionDelete}
            currentUser={this.state.currentUser}
          />
          <DndProvider backend={HTML5Backend}>
            <div className="sub-section">
              <LeftSidebar
                appVersionsId={this.state?.editingVersion?.id}
                showComments={showComments}
                errorLogs={currentState.errors}
                components={currentState.components}
                appId={appId}
                darkMode={this.props.darkMode}
                dataSourcesChanged={this.dataSourcesChanged}
                dataQueriesChanged={this.dataQueriesChanged}
                globalDataSourcesChanged={this.globalDataSourcesChanged}
                onZoomChanged={this.onZoomChanged}
                toggleComments={this.toggleComments}
                switchDarkMode={this.changeDarkMode}
                currentState={currentState}
                debuggerActions={this.sideBarDebugger}
                appDefinition={{
                  components: appDefinition.pages[this.state.currentPageId]?.components ?? {},
                  selectedComponent: selectedComponents ? selectedComponents[selectedComponents.length - 1] : {},
                  pages: this.state.appDefinition.pages,
                  homePageId: this.state.appDefinition.homePageId,
                  showViewerNavigation: this.state.appDefinition.showViewerNavigation,
                }}
                setSelectedComponent={this.setSelectedComponent}
                removeComponent={this.removeComponent}
                runQuery={(queryId, queryName) => runQuery(this, queryId, queryName)}
                ref={this.dataSourceModalRef}
                isSaving={this.state.isSaving}
                currentPageId={this.state.currentPageId}
                addNewPage={this.addNewPage}
                switchPage={this.switchPage}
                deletePage={this.deletePageRequest}
                renamePage={this.renamePage}
                clonePage={this.clonePage}
                hidePage={this.hidePage}
                unHidePage={this.unHidePage}
                updateHomePage={this.updateHomePage}
                updatePageHandle={this.updatePageHandle}
                updateOnPageLoadEvents={this.updateOnPageLoadEvents}
                showHideViewerNavigationControls={this.showHideViewerNavigation}
                updateOnSortingPages={this.updateOnSortingPages}
                apps={apps}
                setEditorMarginLeft={this.handleEditorMarginLeftChange}
                isVersionReleased={this.isVersionReleased()}
                setReleasedVersionPopupState={this.setReleasedVersionPopupState}
              />
              {!showComments && (
                <Selecto
                  dragContainer={'.canvas-container'}
                  selectableTargets={['.react-draggable']}
                  hitRate={0}
                  selectByClick={true}
                  toggleContinueSelect={['shift']}
                  ref={this.selectionRef}
                  scrollOptions={this.state.scrollOptions}
                  onSelectStart={this.onAreaSelectionStart}
                  onSelectEnd={this.onAreaSelectionEnd}
                  onSelect={this.onAreaSelection}
                  onDragStart={this.onAreaSelectionDragStart}
                  onDrag={this.onAreaSelectionDrag}
                  onDragEnd={this.onAreaSelectionDragEnd}
                  onScroll={(e) => {
                    this.canvasContainerRef.current.scrollBy(e.direction[0] * 10, e.direction[1] * 10);
                  }}
                />
              )}
              <div
                className={`main main-editor-canvas ${
                  this.state.isQueryPaneDragging || this.state.isDragging ? 'hide-scrollbar' : ''
                }`}
                id="main-editor-canvas"
                style={{ backgroundColor: this.computeCanvasBackgroundColor() }}
              >
                <div
                  className={`canvas-container align-items-center ${!showLeftSidebar && 'hide-sidebar'}`}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    borderLeft:
                      (this.state.editorMarginLeft ? this.state.editorMarginLeft - 1 : this.state.editorMarginLeft) +
                      `px solid ${this.computeCanvasBackgroundColor()}`,
                    height: this.computeCanvasContainerHeight(),
                  }}
                  onMouseUp={(e) => {
                    if (['real-canvas', 'modal'].includes(e.target.className)) {
                      this.setState({ selectedComponents: [], currentSidebarTab: 2, hoveredComponent: false });
                    }
                  }}
                  ref={this.canvasContainerRef}
                  onScroll={() => {
                    this.selectionRef.current.checkScroll();
                  }}
                >
                  <div style={{ minWidth: `calc((100vw - 300px) - 48px)` }}>
                    <div
                      className="canvas-area"
                      style={{
                        width: currentLayout === 'desktop' ? '100%' : '450px',
                        minHeight: +this.state.appDefinition.globalSettings.canvasMaxHeight,
                        maxWidth:
                          +this.state.appDefinition.globalSettings.canvasMaxWidth +
                          this.state.appDefinition.globalSettings.canvasMaxWidthType,
                        maxHeight: +this.state.appDefinition.globalSettings.canvasMaxHeight,
                        /**
                         * minWidth will be min(default canvas min width, user set max width). Done to avoid conflict between two
                         * default canvas min width = calc(((screen width - width component editor side bar) - width of editor sidebar on left) - width of left sidebar popover)
                         **/
                        // minWidth: this.state.editorMarginLeft ? this.getCanvasMinWidth() : 'auto',
                        backgroundColor: this.computeCanvasBackgroundColor(),
                        transform: 'translateZ(0)', //Hack to make modal position respect canvas container, else it positions w.r.t window.
                      }}
                    >
                      {config.ENABLE_MULTIPLAYER_EDITING && (
                        <RealtimeCursors
                          editingVersionId={this.state?.editingVersion?.id}
                          editingPageId={this.state.currentPageId}
                        />
                      )}
                      {isLoading && (
                        <div className="apploader">
                          <div className="col col-* editor-center-wrapper">
                            <div className="editor-center">
                              <div className="canvas">
                                <div className="mt-5 d-flex flex-column">
                                  <div className="mb-1">
                                    <Skeleton width={'150px'} height={15} className="skeleton" />
                                  </div>
                                  {Array.from(Array(4)).map((_item, index) => (
                                    <Skeleton key={index} width={'300px'} height={10} className="skeleton" />
                                  ))}
                                  <div className="align-self-end">
                                    <Skeleton width={'100px'} className="skeleton" />
                                  </div>
                                  <Skeleton className="skeleton mt-4" />
                                  <Skeleton height={'150px'} className="skeleton mt-2" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {defaultComponentStateComputed && (
                        <>
                          <Container
                            canvasWidth={this.getCanvasWidth()}
                            canvasHeight={this.getCanvasHeight()}
                            socket={this.socket}
                            showComments={showComments}
                            appVersionsId={this.state?.editingVersion?.id}
                            appDefinition={appDefinition}
                            appDefinitionChanged={this.appDefinitionChanged}
                            snapToGrid={true}
                            darkMode={this.props.darkMode}
                            mode={'edit'}
                            zoomLevel={zoomLevel}
                            currentLayout={currentLayout}
                            deviceWindowWidth={deviceWindowWidth}
                            selectedComponents={selectedComponents}
                            appLoading={isLoading}
                            onEvent={this.handleEvent}
                            onComponentOptionChanged={this.handleOnComponentOptionChanged}
                            onComponentOptionsChanged={this.handleOnComponentOptionsChanged}
                            currentState={this.state.currentState}
                            setSelectedComponent={this.setSelectedComponent}
                            handleUndo={this.handleUndo}
                            handleRedo={this.handleRedo}
                            removeComponent={this.removeComponent}
                            onComponentClick={this.handleComponentClick}
                            onComponentHover={this.handleComponentHover}
                            hoveredComponent={hoveredComponent}
                            sideBarDebugger={this.sideBarDebugger}
                            currentPageId={this.state.currentPageId}
                            setReleasedVersionPopupState={this.setReleasedVersionPopupState}
                            isVersionReleased={this.isVersionReleased()}
                          />
                          <CustomDragLayer
                            snapToGrid={true}
                            currentLayout={currentLayout}
                            canvasWidth={this.getCanvasWidth()}
                            onDragging={(isDragging) => this.setState({ isDragging })}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <QueryPanel
                  onQueryPaneDragging={this.handleQueryPaneDragging}
                  handleQueryPaneExpanding={this.handleQueryPaneExpanding}
                  dataQueriesChanged={this.dataQueriesChanged}
                  fetchDataQueries={this.fetchDataQueries}
                  darkMode={this.props.darkMode}
                  currentState={currentState}
                  apps={apps}
                  allComponents={appDefinition.pages[this.state.currentPageId]?.components ?? {}}
                  appId={appId}
                  editingVersionId={editingVersion?.id}
                  appDefinition={appDefinition}
                  dataSourceModalHandler={this.dataSourceModalHandler}
                  isVersionReleased={this.isVersionReleased()}
                  editorRef={this}
                />
                <ReactTooltip id="tooltip-for-add-query" className="tooltip" />
              </div>
              <div className="editor-sidebar">
                <EditorKeyHooks
                  moveComponents={this.moveComponents}
                  cloneComponents={this.cloneComponents}
                  copyComponents={this.copyComponents}
                  cutComponents={this.cutComponents}
                  handleEditorEscapeKeyPress={this.handleEditorEscapeKeyPress}
                  removeMultipleComponents={this.removeComponents}
                />

                {currentSidebarTab === 1 && (
                  <div className="pages-container">
                    {selectedComponents.length === 1 &&
                    !isEmpty(appDefinition.pages[this.state.currentPageId]?.components) &&
                    !isEmpty(appDefinition.pages[this.state.currentPageId]?.components[selectedComponents[0].id]) ? (
                      <Inspector
                        moveComponents={this.moveComponents}
                        componentDefinitionChanged={this.componentDefinitionChanged}
                        removeComponent={this.removeComponent}
                        selectedComponentId={selectedComponents[0].id}
                        currentState={currentState}
                        allComponents={appDefinition.pages[this.state.currentPageId]?.components}
                        key={selectedComponents[0].id}
                        switchSidebarTab={this.switchSidebarTab}
                        apps={apps}
                        darkMode={this.props.darkMode}
                        appDefinitionLocalVersion={this.state.appDefinitionLocalVersion}
                        pages={this.getPagesWithIds()}
                        isVersionReleased={this.isVersionReleased()}
                      ></Inspector>
                    ) : (
                      <center className="mt-5 p-2">
                        {this.props.t('editor.inspectComponent', 'Please select a component to inspect')}
                      </center>
                    )}
                  </div>
                )}

                {currentSidebarTab === 2 && (
                  <WidgetManager
                    componentTypes={componentTypes}
                    zoomLevel={zoomLevel}
                    currentLayout={currentLayout}
                    darkMode={this.props.darkMode}
                    isVersionReleased={this.isVersionReleased()}
                  ></WidgetManager>
                )}
              </div>
              {config.COMMENT_FEATURE_ENABLE && showComments && (
                <CommentNotifications
                  socket={this.socket}
                  appVersionsId={this.state?.editingVersion?.id}
                  toggleComments={this.toggleComments}
                  pageId={this.state.currentPageId}
                />
              )}
            </div>
          </DndProvider>
        </EditorContextWrapper>
      </div>
    );
  }
}

export const Editor = withTranslation()(withRouter(EditorComponent));
