/* eslint-disable import/no-named-as-default */
import React from 'react';
import { LeftSidebarItem } from './SidebarItem';
import { Button, HeaderSection } from '@/_ui/LeftSidebar';
import { DataSourceManager } from '../DataSourceManager';
import { DataSourceTypes } from '../DataSourceManager/SourceComponents';
import { getSvgIcon } from '@/_helpers/appUtils';
import { datasourceService } from '@/_services';
import { ConfirmDialog } from '@/_components';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Popover from '@/_ui/Popover';

export const LeftSidebarDataSources = ({
  appId,
  editingVersionId,
  selectedSidebarItem,
  setSelectedSidebarItem,
  darkMode,
  dataSources = [],
  dataSourcesChanged,
  dataQueriesChanged,
  toggleDataSourceManagerModal,
  showDataSourceManagerModal,
}) => {
  const [selectedDataSource, setSelectedDataSource] = React.useState(null);
  const [isDeleteModalVisible, setDeleteModalVisibility] = React.useState(false);
  const [isDeletingDatasource, setDeletingDatasource] = React.useState(false);

  const deleteDataSource = (selectedSource) => {
    setSelectedDataSource(selectedSource);
    setDeleteModalVisibility(true);
  };

  const executeDataSourceDeletion = () => {
    setDeleteModalVisibility(false);
    setDeletingDatasource(true);
    datasourceService
      .deleteDataSource(selectedDataSource.id)
      .then(() => {
        toast.success('Data Source Deleted');
        setDeletingDatasource(false);
        setSelectedDataSource(null);
        dataSourcesChanged();
        dataQueriesChanged();
      })
      .catch(({ error }) => {
        setDeletingDatasource(false);
        setSelectedDataSource(null);
        toast.error(error);
      });
  };

  const cancelDeleteDataSource = () => {
    setDeleteModalVisibility(false);
    setSelectedDataSource(null);
  };

  const getSourceMetaData = (dataSource) => {
    if (dataSource.plugin_id) {
      return dataSource.plugin?.manifest_file?.data.source;
    }

    return DataSourceTypes.find((source) => source.kind === dataSource.kind);
  };

  const renderDataSource = (dataSource, idx) => {
    const sourceMeta = getSourceMetaData(dataSource);
    const icon = getSvgIcon(sourceMeta.kind.toLowerCase(), 25, 25, dataSource?.plugin?.icon_file?.data);

    return (
      <div className="row py-1" key={idx}>
        <div
          role="button"
          onClick={() => {
            setSelectedDataSource(dataSource);
            toggleDataSourceManagerModal(true);
          }}
          className="col"
        >
          {icon}
          <span className="font-500" style={{ paddingLeft: 5 }}>
            {dataSource.name}
          </span>
        </div>
        <div className="col-auto">
          <button className="btn btn-sm ds-delete-btn" onClick={() => deleteDataSource(dataSource)}>
            <div>
              <img src="assets/images/icons/query-trash-icon.svg" width="12" height="12" />
            </div>
          </button>
        </div>
      </div>
    );
  };

  const popoverContent = (
    <LeftSidebarDataSources.Container
      darkMode={darkMode}
      renderDataSource={renderDataSource}
      dataSources={dataSources}
      toggleDataSourceManagerModal={toggleDataSourceManagerModal}
    />
  );

  return (
    <>
      <ConfirmDialog
        show={isDeleteModalVisible}
        message={'You will lose all the queries created from this data source. Do you really want to delete?'}
        confirmButtonLoading={isDeletingDatasource}
        onConfirm={() => executeDataSourceDeletion()}
        onCancel={() => cancelDeleteDataSource()}
        darkMode={darkMode}
      />
      <Popover popoverContentClassName="p-0" side="right" popoverContent={popoverContent}>
        <LeftSidebarItem
          selectedSidebarItem={selectedSidebarItem}
          onClick={() => setSelectedSidebarItem('database')}
          icon="database"
          className={`left-sidebar-item sidebar-datasources left-sidebar-layout`}
        />
      </Popover>

      <DataSourceManager
        appId={appId}
        showDataSourceManagerModal={showDataSourceManagerModal}
        darkMode={darkMode}
        hideModal={() => {
          setSelectedDataSource(null);
          toggleDataSourceManagerModal(false);
        }}
        editingVersionId={editingVersionId}
        dataSourcesChanged={dataSourcesChanged}
        selectedDataSource={selectedDataSource}
      />
    </>
  );
};

const LeftSidebarDataSourcesContainer = ({
  darkMode,
  renderDataSource,
  dataSources = [],
  toggleDataSourceManagerModal,
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <HeaderSection darkMode={darkMode}>
        <HeaderSection.PanelHeader title="Datasources">
          <div className="d-flex justify-content-end">
            <Button
              onClick={() => toggleDataSourceManagerModal(true)}
              darkMode={darkMode}
              size="sm"
              styles={{ width: '76px' }}
            >
              <Button.Content title={'Add'} iconSrc={'assets/images/icons/plus.svg'} direction="left" />
            </Button>
          </div>
        </HeaderSection.PanelHeader>
      </HeaderSection>
      <div className="card-body">
        <div className="d-flex w-100">
          {dataSources.length === 0 ? (
            <center
              onClick={() => toggleDataSourceManagerModal(true)}
              className="p-2 color-primary cursor-pointer"
              data-cy="add-datasource-link"
            >
              {t(`leftSidebar.Sources.addDataSource`, '+ add data source')}
            </center>
          ) : (
            <div className="mt-2 w-100" data-cy="datasource-Label">
              {dataSources?.map((source, idx) => renderDataSource(source, idx))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

LeftSidebarDataSources.Container = LeftSidebarDataSourcesContainer;
