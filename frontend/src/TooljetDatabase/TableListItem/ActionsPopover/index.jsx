import React from 'react';
import cx from 'classnames';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import EditIcon from '../../Icons/EditColumn.svg';
// import CloneIcon from './Icons/Clone.svg';
import DeleteIcon from './Icons/Delete.svg';
import SolidIcon from '@/_ui/Icon/SolidIcons';
import Menu from '../../Icons/Menu.svg';

export const ListItemPopover = ({
  onEdit,
  onDelete,
  darkMode,
  handleExportTable,
  onMenuToggle,
  onAddNewColumnBtnClick,
}) => {
  const closeMenu = () => {
    document.body.click();
  };

  const popover = (
    <Popover id="popover-contained" className={`table-list-items ${darkMode && 'dark-theme'}`}>
      <Popover.Body className={`${darkMode && 'dark-theme'}`}>
        <div className={`row cursor-pointer`}>
          <div className="col-auto" data-cy="edit-option-icon">
            <EditIcon />
          </div>
          <div
            className="col text-truncate"
            data-cy="rename-table-option"
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              onEdit();
            }}
          >
            Edit table
          </div>
        </div>
        <div className={`row mt-3 cursor-pointer`}>
          <div className="col-auto" data-cy="add-new-column-icon">
            <SolidIcon name="column" width="14" />
          </div>
          <div
            className="col text-truncate"
            data-cy="add-new-column-option"
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              onAddNewColumnBtnClick();
            }}
          >
            Add new column
          </div>
        </div>
        <div className="row mt-3 cursor-pointer">
          <div className="col-auto" data-cy="export-schema-option-icon">
            <SolidIcon name="filedownload" width="14" viewBox="0 0 25 25" />
          </div>
          <div
            className="col text-truncate"
            data-cy="export-schema-option"
            onClick={() => {
              closeMenu();
              handleExportTable();
            }}
          >
            Export schema
          </div>
        </div>
        {/* <div className="row mt-3">
          <div className="col-auto">
            <CloneIcon />
          </div>
          <div className="col text-truncate">Duplicate</div>
        </div> */}
        <div className="row mt-3 cursor-pointer">
          <div className="col-auto" data-cy="delete-table-option-icon">
            <DeleteIcon />
          </div>
          <div
            className="col text-truncate"
            data-cy="delete-table-option"
            onClick={() => {
              closeMenu();
              onDelete();
            }}
          >
            Delete table
          </div>
        </div>
      </Popover.Body>
    </Popover>
  );

  return (
    <OverlayTrigger trigger="click" placement="bottom" rootClose onToggle={onMenuToggle} overlay={popover}>
      <div className={cx(`float-right cursor-pointer table-list-item-popover`)} data-cy="table-kebab-icon">
        <Menu width="20" height="20" />
      </div>
    </OverlayTrigger>
  );
};
