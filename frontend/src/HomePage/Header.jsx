import React from 'react';
import { SearchBox } from '@/_components/SearchBox';
import { Button, ButtonGroup, Dropdown } from 'react-bootstrap';

export default function Header({
  folderName,
  onSearchSubmit,
  handleImportApp,
  isImportingApp,
  creatingApp,
  canCreateApp,
  createApp,
  showTemplateLibraryModal,
  fileInput,
}) {

  const dropdownStyle={
    minWidth: '11rem',
    display: 'flex',
    alignItems: 'center',
    margin: 0,
    lineHeight:' 1.4285714',
    display: 'block',
    width: '100%',
    padding:' 0.5rem 0.75rem',
    clear: 'both',
    fontWeight: '400',
    color: 'inherit',
    textAlign: 'inherit',
    whiteSpace: 'nowrap',
    // backgroundColor: 'transparent',
    border: '0',
    cursor:'pointer',
    backgroundColor: {
      default: 'white',
      hover: 'red',
      active: 'navy',
      focus: 'white',
     },
  }
  
  return (
    <div className="row">
      <div className="col-4">
        <h2 className="page-title px-2">{folderName}</h2>
      </div>

      <div className="col-8 ms-auto d-print-none d-flex flex-row justify-content-end">
        <SearchBox onSubmit={onSearchSubmit} />
        {canCreateApp() && (
          <>
            {canCreateApp() && (
              <Dropdown as={ButtonGroup}>
                <Button
                  className={`btn btn-primary d-none d-lg-inline mb-3 ms-2 ${creatingApp ? 'btn-loading' : ''}`}
                  onClick={createApp}
                >
                  {isImportingApp && <span className="spinner-border spinner-border-sm mx-2" role="status"></span>}
                  Create new application
                </Button>
                <Dropdown.Toggle split className="btn btn-primary d-none d-lg-inline mb-3" />
                <Dropdown.Menu>
                  <Dropdown.Item onClick={showTemplateLibraryModal}>Choose from template</Dropdown.Item>
                  <label style={dropdownStyle} onChange={handleImportApp}>  
                    Import
                    < input type="file" accept=".json" ref={fileInput} style={{ display: 'none', zIndex: '100' }} />
                  </label>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </>
        )}
      </div>
    </div>
  );
}
