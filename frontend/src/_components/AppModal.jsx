import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../HomePage/Modal';
import { ButtonSolid } from '@/_ui/AppButton/AppButton';
import _ from 'lodash';
import { validateName } from '@/_helpers/utils';
import { useTranslation } from 'react-i18next';
import { FormWrapper } from './FormWrapper';

export function AppModal({
  closeModal,
  processApp,
  show,
  fileContent = null,
  templateDetails = null,
  selectedAppId = null,
  selectedAppName = null,
  title,
  actionButton,
  actionLoadingButton,
}) {
  const { t } = useTranslation();

  if (!selectedAppName && templateDetails) {
    selectedAppName = templateDetails?.name || '';
  } else if (!selectedAppName) {
    selectedAppName = '';
  }

  if (actionButton === t('homePage.homePage.cloneApp', 'Clone app')) {
    if (selectedAppName.length >= 45) {
      selectedAppName = selectedAppName.slice(0, 45) + '_Copy';
    } else {
      selectedAppName = selectedAppName + '_Copy';
    }
  }

  const [deploying, setDeploying] = useState(false);
  const [newAppName, setNewAppName] = useState(selectedAppName);
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNameChanged, setIsNameChanged] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [clearInput, setClearInput] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setIsNameChanged(newAppName?.trim() !== selectedAppName);
  }, [newAppName, selectedAppName]);

  useEffect(() => {
    setIsSuccess(false);
  }, [show]);

  useEffect(() => {
    inputRef.current?.select();
  }, [show]);

  useEffect(() => {
    setIsSuccess(false);
    setClearInput(false);
    setNewAppName(selectedAppName);
  }, [selectedAppName]);

  const handleAction = async (e) => {
    setDeploying(true);
    const trimmedAppName = newAppName.trim();
    setNewAppName(trimmedAppName);
    if (!errorText) {
      setIsLoading(true);
      try {
        let success = true;
        //create app from template
        if (templateDetails) {
          success = await processApp(e, trimmedAppName, templateDetails);
          //import app
        } else if (fileContent) {
          success = await processApp(fileContent, trimmedAppName);
          //rename app/clone existing app
        } else if (selectedAppId) {
          success = await processApp(trimmedAppName, selectedAppId);
          //create app from scratch
        } else {
          success = await processApp(trimmedAppName);
        }
        if (success === false) {
          setErrorText(t('_components.appModal.appNameExists', 'App name already exists'));
          setInfoText('');
        } else {
          setErrorText('');
          setInfoText('');
          closeModal();
        }
      } catch (error) {
        toast.error(e.error, {
          position: 'top-center',
        });
      }
    }
    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    const newAppName = e.target.value;
    const trimmedName = newAppName.trim();
    setNewAppName(newAppName);
    if (newAppName.length >= 50) {
      setInfoText(t('_components.appModal.maxLenReached', 'Maximum length has been reached'));
    } else {
      setInfoText('');
      const error = validateName(trimmedName, 'App', false);
      setErrorText(error?.errorMsg || '');
    }
  };

  const createBtnDisableState =
    isLoading ||
    errorText ||
    (actionButton === t('homePage.appCard.renameApp', 'Rename app') &&
      (!isNameChanged || newAppName.trim().length === 0 || newAppName.length > 50)) || // For rename case
    (actionButton !== t('homePage.appCard.renameApp', 'Rename app') &&
      (newAppName.length > 50 || newAppName.trim().length === 0));

  return (
    <Modal
      show={show}
      closeModal={closeModal}
      title={title}
      footerContent={
        <>
          <ButtonSolid variant="tertiary" onClick={closeModal} data-cy="cancel-button" className="modal-footer-divider">
            {t('globals.cancel', 'Cancel')}
          </ButtonSolid>
          <ButtonSolid
            form="createAppForm"
            type="submit"
            data-cy={actionButton.toLowerCase().replace(/\s+/g, '-')}
            disabled={createBtnDisableState}
          >
            {isLoading ? actionLoadingButton : actionButton}
          </ButtonSolid>
        </>
      }
    >
      <FormWrapper callback={handleAction} id="createAppForm">
        <div className="row workspace-folder-modal mb-3">
          <div className="col modal-main tj-app-input">
            <label className="tj-input-label" data-cy="app-name-label">
              {t('_components.appModal.appName', 'App Name')}
            </label>
            <input
              type="text"
              onChange={handleInputChange}
              className={`form-control ${errorText ? 'input-error-border' : ''}`}
              placeholder={t('_components.appModal.enterAppName', 'Enter app name')}
              value={newAppName}
              data-cy="app-name-input"
              maxLength={50}
              autoFocus
              ref={inputRef}
              style={{
                borderColor: errorText ? '#DB4324 !important' : 'initial',
              }}
            />
            {errorText ? (
              <small
                className="tj-input-error"
                style={{
                  fontSize: '10px',
                  color: '#DB4324',
                }}
                data-cy="app-name-error-label"
              >
                {errorText}
              </small>
            ) : infoText || newAppName.length >= 50 ? (
              <small
                className="tj-input-error"
                style={{
                  fontSize: '10px',
                  color: '#ED5F00',
                }}
                data-cy="app-name-info-label"
              >
                {infoText || t('_components.appModal.maxLenReached', 'Maximum length has been reached')}
              </small>
            ) : (
              <small
                className="tj-input-error"
                style={{
                  fontSize: '10px',
                  color: '#7E868C',
                }}
                data-cy="app-name-info-label"
              >
                {t('_components.appModal.uniqueAppNameMax50', 'App name must be unique and max 50 characters')}
              </small>
            )}
          </div>
        </div>
      </FormWrapper>
    </Modal>
  );
}
