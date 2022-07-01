import React, { useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import JSONTreeViewer from '@/_ui/JSONTreeViewer';

export const TreeSelect = function ({
  id,
  component,
  height,
  width,
  properties,
  styles,
  exposedVariables,
  setExposedVariable,
  onComponentClick,
  darkMode,
  fireEvent,
  currentState,
}) {
  // console.log(component, currentState);
  const [selectedValues, setSelectedValues] = useState(['Manish']);
  const data = {
    countries: {
      India: {
        states: ['Maharashtra', 'Assam'],
      },
      Portugal: {
        states: {
          Alentejo: ['Aveiro', 'Beja', 'Braga'],
          Beira: ['Faro', 'Guarda', 'Leiria'],
        },
      },
    },
  };
  return (
    <div style={{ width, position: 'relative' }} className="">
      <OverlayTrigger
        trigger="click"
        rootClose={true}
        placement="bottom-end"
        delay={{ show: 800, hide: 100 }}
        overlay={
          <div style={{ position: 'absolute', top: '10', width, background: 'white', padding: '1rem' }}>
            <JSONTreeViewer
              data={data}
              useIcons={false}
              useIndentedBlock={false}
              enableCopyToClipboard={false}
              useActions={false}
              actionIdentifier="id"
              expandWithLabels={true}
              showNodeType={false}
              customComponent={CustomComponent}
              hideArrayKeys={true}
            />
          </div>
        }
      >
        <div style={{ padding: '0.25rem 0' }}>{selectedValues}</div>
      </OverlayTrigger>
    </div>
  );
};

const CustomComponent = ({ data, type, ...restProps }) => {
  return <p>{String(data)}</p>;
};
