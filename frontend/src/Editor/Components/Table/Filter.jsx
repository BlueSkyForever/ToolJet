import React from 'react';
import SelectSearch, { fuzzySearch } from 'react-select-search';
import { useTranslation } from 'react-i18next';
import { useMounted } from '@/_hooks/use-mount';
import _ from 'lodash';

export function Filter(props) {
  const mounted = useMounted();
  const { t } = useTranslation();

  const { mergeToFilterDetails, filterDetails, setAllFilters, fireEvent } = props;
  const { filters } = filterDetails;

  const [activeFilters, set] = React.useState(filters);

  function didFilterUpdate() {
    const tableFilters = JSON.parse(JSON.stringify(filters));

    const currentDiff = diffingFilterDetails(activeFilters, tableFilters)[0];
    const currentFilterUpdates = tableFilters.filter((filter) => filter.id === currentDiff.diff.id)[0];

    if (currentDiff) {
      const shouldFire = shouldFireEvent(currentDiff?.type, currentFilterUpdates);

      if (shouldFire) {
        console.log('should fire');
        fireEvent('onFilterChanged');
      }
    }

    set(tableFilters);
  }

  function filterColumnChanged(index, value, name) {
    const newFilters = filters;
    newFilters[index].id = value;
    newFilters[index].value.where = name;
    mergeToFilterDetails({
      filters: newFilters,
    });
    setAllFilters(newFilters.filter((filter) => filter.id !== ''));
  }

  function filterOperationChanged(index, value) {
    const newFilters = filters;
    newFilters[index].value = {
      ...newFilters[index].value,
      operation: value,
    };
    mergeToFilterDetails({
      filters: newFilters,
    });
    setAllFilters(newFilters.filter((filter) => filter.id !== ''));
  }

  function filterValueChanged(index, value) {
    const newFilters = filters;
    newFilters[index].value = {
      ...newFilters[index].value,
      value: value,
    };
    mergeToFilterDetails({
      filters: newFilters,
    });
    setAllFilters(newFilters.filter((filter) => filter.id !== ''));
  }

  function addFilter() {
    mergeToFilterDetails({ filters: [...filters, { id: '', value: { operation: 'contains', value: '' } }] });
  }

  function removeFilter(index) {
    let newFilters = filters;
    newFilters.splice(index, 1);
    mergeToFilterDetails({
      filters: newFilters,
    });
    setAllFilters(newFilters.filter((filter) => filter.id !== ''));
    fireEvent('onFilterChanged');
  }

  function clearFilters() {
    mergeToFilterDetails({
      filters: [],
    });
    setAllFilters([]);
  }

  React.useEffect(() => {
    // if (mounted) {
    //   fireEvent('onFilterChanged');
    // }
    didFilterUpdate();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return (
    <div className="table-filters card">
      <div className="card-header row">
        <div className="col">
          <h4 className="font-weight-normal">Filters</h4>
        </div>
        <div className="col-auto">
          <button onClick={() => props.hideFilters()} className="btn btn-light btn-sm">
            x
          </button>
        </div>
      </div>
      <div className="card-body">
        {props.filters.map((filter, index) => (
          <div className="row mb-2" key={index}>
            <div className="col p-2" style={{ maxWidth: '70px' }}>
              <small>{index > 0 ? 'and' : 'where'}</small>
            </div>
            <div className="col">
              <SelectSearch
                options={props.columns}
                value={filter.id}
                search={true}
                onChange={(value, item) => {
                  filterColumnChanged(index, value, item.name);
                }}
                filterOptions={fuzzySearch}
                placeholder={t('globals.select', 'Select') + '...'}
              />
            </div>
            <div className="col" style={{ maxWidth: '180px' }}>
              <SelectSearch
                options={[
                  { name: 'contains', value: 'contains' },
                  { name: 'does not contains', value: 'doesNotContains' },
                  { name: 'matches', value: 'matches' },
                  { name: 'does not match', value: 'nl' },
                  { name: 'equals', value: 'equals' },
                  { name: 'does not equal', value: 'ne' },
                  { name: 'is empty', value: 'isEmpty' },
                  { name: 'is not empty', value: 'isNotEmpty' },
                  { name: 'greater than', value: 'gt' },
                  { name: 'less than', value: 'lt' },
                  { name: 'greater than or equals', value: 'gte' },
                  { name: 'less than or equals', value: 'lte' },
                ]}
                value={filter.value.operation}
                search={true}
                onChange={(value) => {
                  filterOperationChanged(index, value);
                }}
                filterOptions={fuzzySearch}
                placeholder="Select.."
              />
            </div>
            <div className="col">
              {['isEmpty', 'isNotEmpty'].includes(filter.value.operation) || (
                <input
                  type="text"
                  value={filter.value.value}
                  placeholder="value"
                  className="form-control"
                  onChange={(e) => filterValueChanged(index, e.target.value)}
                />
              )}
            </div>
            <div className="col-auto">
              <button
                onClick={() => removeFilter(index)}
                className={`btn ${props.darkMode ? 'btn-dark' : 'btn-light'} btn-sm p-2 text-danger font-weight-bold`}
              >
                x
              </button>
            </div>
          </div>
        ))}
        {props.filters.length === 0 && (
          <div>
            <center>
              <span>no filters yet.</span>
            </center>
          </div>
        )}
      </div>
      <div className="card-footer">
        <button onClick={addFilter} className="btn btn-light btn-sm">
          + add filter
        </button>
        <button onClick={() => clearFilters()} className="btn btn-light btn-sm mx-2">
          clear filters
        </button>
      </div>
    </div>
  );
}

const diffingFilterDetails = (prev, next) => {
  function diffingValues(prev, next) {
    const diff = {};

    for (let key in next) {
      if (next[key] !== prev[key]) {
        diff[key] = next[key];
      }
    }

    return diff;
  }
  let diffingType = undefined;

  const diff = [];

  for (let i = 0; i < next.length; i++) {
    const nextItem = next[i];
    const prevItem = prev[i];

    if (nextItem && (!prevItem || nextItem.id !== prevItem.id)) {
      diffingType = 'column';

      diff.push({
        type: diffingType,
        diff: {
          id: nextItem.id,
          value: nextItem.value.where,
        },
      });
    } else if (prevItem.id === nextItem.id) {
      const diffingObject = diffingValues(prevItem.value, nextItem.value);
      if (diffingObject) {
        diffingType = Object.keys(diffingObject)[0];
        diff.push({
          type: diffingType,
          diff: {
            id: nextItem.id,
            value: diffingObject[diffingType],
          },
        });
      }
    }
  }

  return diff;
};

function shouldFireEvent(diffType, filter) {
  switch (diffType) {
    case 'value':
      return filter.value?.operation && filter.value?.value ? true : false;

    case 'column':
      return filter.value?.operation && filter.value?.value ? true : false;

    case 'operation':
      return filter.value?.where && filter.value?.value ? true : false;

    default:
      return false;
  }
}
