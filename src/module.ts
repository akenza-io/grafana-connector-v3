import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './DataSource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';

export const plugin = new DataSourcePlugin<DataSource, AkenzaQuery, AkenzaDataSourceConfig>(DataSource)
    .setConfigEditor(ConfigEditor)
    .setQueryEditor(QueryEditor);
