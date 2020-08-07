import React, { useEffect, useMemo, useState } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHealth, EuiIcon, EuiSearchBar, EuiSpacer } from '@elastic/eui';

import { AddToast, Group, GroupDefsType, Item, SetType } from '../data/types';

import { defaultSearchableFields, getItems } from '../data/Store';
import { groupBy, map, uniq } from 'lodash';
import { ItemsTable } from './ItemsTable';
import { siteIcons, typeIcons } from '../icons/icons';
import { getLanguages } from '../data/languages';
import { usePersistedJsonState } from '../utils';
import { GroupSelector } from './GroupSelector';
import { SyncButton } from './SyncButton';

const initialQuery = EuiSearchBar.Query.MATCH_ALL;

const schema = {
  strict: true,
  fields: {
    status: { type: 'string' },
    type: { type: 'string' },
    ok: { type: 'boolean' },
    behind: { type: 'number' },
    diverged: { type: 'boolean' },
    lang: { type: 'string' },
    project: { type: 'string' },
    title: { type: 'string' },
    srcSite: { type: 'string' },
    srcFullTitle: { type: 'string' },
    srcTitleUrl: { type: 'string' },
    dstSite: { type: 'string' },
    dstFullTitle: { type: 'string' },
    dstTitle: { type: 'string' },
    dstTitleUrl: { type: 'string' },
  },
};

const groupDefs: GroupDefsType = {
  'lang': {
    order: 1,
    columns: ['lang'],
    groupName: 'by language',
  },
  'project': {
    order: 1,
    columns: ['project'],
    groupName: 'by project',
  },
  'dstSite': {
    order: 2,
    columns: ['dstSite'],
    extra_columns: ['lang', 'project'],
    groupName: 'by wiki',
  },
  'srcTitleUrl': {
    order: 3,
    columns: ['type', 'title'],
    extra_columns: ['srcSite', 'srcFullTitle', 'srcTitleUrl'],
    groupName: 'by title',
  },
};

async function getOptions(allItems: Array<Item>, field: ('type' | 'project'), optionsMap: { [key: string]: any }) {
  const values = uniq(allItems.map(v => v[field])).filter(v => v);
  values.sort();

  return values.map(value => ({
    value: value,
    view: (<EuiFlexGroup>
      <EuiFlexItem grow={false}><EuiIcon type={optionsMap[value]} size={'m'}/></EuiFlexItem>
      <EuiFlexItem grow={false}>{value[0].toUpperCase() + value.substring(1)}</EuiFlexItem>
    </EuiFlexGroup>)
  }));
}

export const WorkArea = (props: {
  addToast: AddToast,
  setItem: SetType,
}) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<Item>>(() => new Set());
  const [query, setQuery] = useState(initialQuery);

  const [allItems, setAllItems] = useState<Array<Item>>(() => []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoading) {
      (async () => {
        setAllItems([]);
        setMessage('Loading ...');
        setError('');

        try {
          setAllItems(await getItems(props.addToast));
        } catch (err) {
          setError(`Unable to load data. ${err}`);
        }

        setIsLoading(false);
        setMessage('');
        setSelectedItems(new Set());
      })();
    }
  }, [isLoading, props.addToast]);

  const filteredItems = useMemo(() => {
    // console.log('original data', allItems);
    // try {
    //   console.log('esQueryDsl', EuiSearchBar.Query.toESQuery(query));
    // } catch (e) {
    //   console.error(`error in esQueryDsl: ${e}`);
    // }
    // try {
    //   console.log('esQueryString', EuiSearchBar.Query.toESQueryString(query));
    // } catch (e) {
    //   console.error(`error in esQueryString: ${e}`);
    // }
    return EuiSearchBar.Query.execute(query, allItems, { defaultSearchableFields });
  }, [allItems, query]);
  // console.log('filtered data', filteredItems);

  const [rawGroupSelection, setGroupSelection] = usePersistedJsonState<Array<keyof Item>>('groupSelection', ['srcTitleUrl']);
  // Just in case local store has some weird values, filter them out
  const groupSelection = rawGroupSelection.filter(v => groupDefs.hasOwnProperty(v));

  const groupedItems = useMemo(() => {
    function makeLastItem(items: Array<Item>, parentColumns: Array<string>) {
      return { items, columns: ['selector', 'actions'].concat(parentColumns), isLastGroup: true };
    }

    function organizeItemsInGroups(groupIndex: number, itemList: Array<Item>, parentColumns: Array<keyof Item>, parentKey = '') {
      if (itemList.length === 1 || groupIndex === groupSelection.length) {
        return makeLastItem(itemList, parentColumns);
      }

      const groupKey = groupSelection[groupIndex];
      const groupDef = groupDefs[groupKey];
      const columns = parentColumns.filter(v => !groupDef.columns.includes(v));

      const groupedData = groupBy(itemList, v => v[groupKey]);
      const values = Object.values(groupedData);
      if (values.length === 1 || values.every(v => v.length === 1)) {
        return makeLastItem(itemList, parentColumns);
      }

      const items: Array<Group> = map(groupedData, allSubItems => {
        const first = allSubItems[0];
        const key = parentKey + '/' + first[groupKey];
        return {
          key: key,
          allSubItems: allSubItems,
          countOk: allSubItems.filter(v => v.status === 'ok').length,
          countNotLocalized: allSubItems.filter(v => v.status === 'needs_refresh').length,
          countOutdated: allSubItems.filter(v => v.status === 'outdated').length,
          countDiverged: allSubItems.filter(v => v.status === 'diverged').length,
          ...Object.fromEntries(groupDef.columns.map(v => [v, first[v]])),
          ...Object.fromEntries((groupDef.extra_columns ?? []).map(v => [v, first[v]])),
          ...organizeItemsInGroups(groupIndex + 1, allSubItems, columns, key)
        };
      });
      items.sort((a, b) => a.key.localeCompare(b.key));

      return {
        columns: ['expander', 'selector'].concat(groupDef.columns, 'countOk', 'countNotLocalized', 'countOutdated', 'countDiverged'),
        items: items
      };
    }

    return organizeItemsInGroups(0, filteredItems, ['type', 'dstSite', 'dstTitle', 'status']);
  }, [filteredItems, groupSelection]);

  const itemsTable = useMemo(() => {
    return (<ItemsTable
      groupedItems={groupedItems}
      isLoading={isLoading}
      message={message}
      error={error}
      selectedItems={selectedItems}
      setSelectedItems={setSelectedItems}
      {...props}
    />);
  }, [props, error, groupedItems, isLoading, message, selectedItems]);

  const toolbar = useMemo(() => {
    const searchBar = (<EuiSearchBar
      defaultQuery={initialQuery}
      box={{
        isClearable: true,
        // placeholder: '',
        incremental: true,
        fullWidth: true,
        schema,
      }}
      filters={[
        {
          type: 'field_value_selection',
          field: 'status',
          name: 'Status',
          multiSelect: 'or',
          options: async () => {
            return map({
              'ok': 'success',
              'outdated': 'warning',
              'needs_refresh': 'warning',
              'diverged': 'danger'
            }, (v, k) => ({
              value: k,
              view: <EuiHealth color={v}>{k}</EuiHealth>,
            }));
          },
        },
        {
          type: 'field_value_selection',
          field: 'type',
          name: 'Type',
          multiSelect: 'or',
          options: () => getOptions(allItems, 'type', typeIcons),
        },
        {
          type: 'field_value_selection',
          field: 'project',
          name: 'Project',
          multiSelect: 'or',
          options: () => getOptions(allItems, 'project', siteIcons),
        },
        {
          type: 'field_value_selection',
          field: 'lang',
          name: 'Language',
          multiSelect: 'or',
          options: async () => {
            const values = uniq(allItems.map(v => v.lang));
            values.sort();
            const allLangs = await getLanguages(props.addToast);
            return values.map(lang => {
              const langInfo = allLangs[lang] || { name: 'Unknown' };
              let name = langInfo.name;
              if (langInfo.autonym && langInfo.autonym !== langInfo.name) {
                name += ` - ${langInfo.autonym}`;
              }
              return {
                value: lang,
                view: <EuiFlexGroup>
                  <EuiFlexItem grow={false} className={'lang-code'}>{lang}</EuiFlexItem>
                  <EuiFlexItem grow={false}>{name}</EuiFlexItem>
                </EuiFlexGroup>
              };
            });
          },
        },
      ]}
      onChange={({ query, error }: any) => {
        if (error) {
          setError(error.message);
        } else {
          setError('');
          setQuery(query);
        }
      }}
    />);

    const refreshButton = (<EuiButton
      key="loadItems"
      iconType="refresh"
      isDisabled={isLoading}
      isLoading={isLoading}
      onClick={() => setIsLoading(true)}
    >
      {isLoading ? 'Refreshing...' : 'Refresh'}
    </EuiButton>);

    return (<EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <SyncButton selectedItems={selectedItems} setSelectedItems={setSelectedItems}/></EuiFlexItem>
        <EuiFlexItem style={{ minWidth: '10em' }} grow={false}>
          <GroupSelector groupDefs={groupDefs} groupSelection={groupSelection} setGroupSelection={setGroupSelection}/>
        </EuiFlexItem>
        <EuiFlexItem>{searchBar}</EuiFlexItem>
        <EuiFlexItem grow={false}>{refreshButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [allItems, groupSelection, isLoading, props.addToast, selectedItems, setGroupSelection]);

  return (
    <>
      {toolbar}
      <EuiSpacer size={'l'}/>
      {itemsTable}
    </>);
};