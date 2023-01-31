import { DataQuery, DataSourceJsonData } from '@grafana/data';
import { Device } from './AkenzaTypes';

export interface AkenzaQuery extends DataQuery {
    deviceId?: string;
    device?: Device;
    topic?: string;
    dataKey?: string;
}

export interface AkenzaDataSourceConfig extends DataSourceJsonData {
    baseUrl: string;
    // NOTE: backwards compatibility: the api key property still needs to present, as currently configured data sources still use the unencrypted properties...
    apiKey: string | null;
}

export interface AkenzaSecureDataSourceConfig {
    apiKey?: string;
}
