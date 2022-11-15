import React, { useEffect } from 'react';
import { JSONTree } from 'react-json-tree';
import { Tab, ListGroup, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
const Preview = ({ previewPanelRef, previewLoading, queryPreviewData, theme, darkMode }) => {
  console.log(previewLoading, queryPreviewData, 'p');
  const { t } = useTranslation();
  const [key, setKey] = React.useState('raw');
  const [isJson, setIsJson] = React.useState(false);
  const tabs = ['JSON', 'Raw'];

  useEffect(() => {
    if (typeof queryPreviewData === 'object') {
      setKey('json');
    } else {
      setKey('raw');
    }
    setIsJson(typeof queryPreviewData === 'object');
  }, [queryPreviewData]);

  const renderRawData = () => {
    if (queryPreviewData) {
      return isJson ? JSON.stringify(queryPreviewData).toString() : queryPreviewData.toString();
    }
    return '';
  };

  return (
    <div>
      <div className="preview-header d-flex align-items-baseline font-weight-500" ref={previewPanelRef}>
        <div className={`py-2 ${darkMode ? 'color-dark-slate12' : 'color-light-slate-12'}`}>
          {t('editor.preview', 'Preview')}
        </div>
        <Tab.Container activeKey={key} onSelect={(k) => setKey(k)} defaultActiveKey="raw">
          <Row style={{ width: '100%', paddingLeft: '20px' }}>
            <div className="keys">
              <ListGroup className={`query-preview-list-group ${darkMode ? 'dark' : ''}`} variant="flush">
                {tabs.map((tab) => (
                  <ListGroup.Item key={tab} eventKey={tab.toLowerCase()} disabled={!queryPreviewData}>
                    <span data-cy={`preview-tab-${String(tab).toLowerCase()}`}>{tab}</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
            {!queryPreviewData && (
              <div
                className="col"
                style={{
                  userSelect: 'text',
                  backgroundColor: darkMode ? '#1A1D1E' : '#F8F9FA',
                  border: '0 0 6px 6px',
                  height: '52px',
                }}
              ></div>
            )}
            {previewLoading && (
              <center>
                <div className="spinner-border text-azure mt-5" role="status"></div>
              </center>
            )}
            {!queryPreviewData && !previewLoading && (
              <div
                className="col"
                style={{
                  userSelect: 'text',
                  backgroundColor: darkMode ? '#1A1D1E' : '#F8F9FA',
                  border: '0 0 6px 6px',
                  height: '52px',
                }}
              ></div>
            )}
            <Tab.Content style={{ overflowWrap: 'anywhere' }}>
              <Tab.Pane eventKey="json" transition={false}>
                <div className="">
                  {previewLoading === false && isJson && (
                    <div className="w-100 ">
                      <JSONTree theme={theme} data={queryPreviewData} invertTheme={!darkMode} collectionLimit={100} />
                    </div>
                  )}
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="raw" transition={false}>
                <div className={`mt-2 raw-container `}>{renderRawData()}</div>
              </Tab.Pane>
            </Tab.Content>
          </Row>
        </Tab.Container>
      </div>
    </div>
  );
};

export default Preview;
