import { DataQuery, DataSourceJsonData } from '@grafana/data';
import { Asset } from './AkenzaTypes';

export interface AkenzaQuery extends DataQuery {
    assetId?: string;
    asset?: Asset;
    topic?: string;
    dataKey?: string;
}

export interface AkenzaDataSourceConfig extends DataSourceJsonData {
    baseUrl: string;
    apiKey: string;
}
