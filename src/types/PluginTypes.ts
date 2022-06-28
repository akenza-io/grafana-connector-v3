import {DataQuery, DataSourceJsonData} from '@grafana/data';
import { Device } from './AkenzaTypes';

export interface AkenzaQuery extends DataQuery {
    deviceId?: string;
    device?: Device;
    topic?: string;
    dataKey?: string;
}

export interface AkenzaDataSourceConfig extends DataSourceJsonData {
    baseUrl: string;
    // the api key property still needs to be left in here as currently configured data sources still use the unencrypted properties...
    apiKey: string|null;
    organizationId: string;
}

export interface AkenzaSecureDataSourceConfig {
    apiKey?: string;
}
