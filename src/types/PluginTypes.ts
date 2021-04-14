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
    apiKey: string;
    organizationId: string;
}
