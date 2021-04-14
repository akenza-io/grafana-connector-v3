import {
    DataQueryRequest,
    DataQueryResponse,
    DataSourceApi,
    DataSourceInstanceSettings,
    DateTime,
    FieldType,
    MutableDataFrame,
    dateTime,
    SelectableValue,
} from '@grafana/data';
import { BackendSrvRequest, getBackendSrv } from '@grafana/runtime';
import buildUrl from 'build-url';
import { Device, DeviceData, DeviceList, Organization, OrganizationList, TimeSeriesData } from './types/AkenzaTypes';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';
import { HttpErrorPromise, HttpPromise } from './types/Utils';

export class DataSource extends DataSourceApi<AkenzaQuery, AkenzaDataSourceConfig> {
    private config: AkenzaDataSourceConfig;

    constructor(instanceSettings: DataSourceInstanceSettings<AkenzaDataSourceConfig>) {
        super(instanceSettings);
        this.config = instanceSettings.jsonData;
    }

    async testDatasource() {
        const params = {
            size: 1,
            minimal: true,
        };

        return this.doRequest('/v3/organizations', 'GET', params).then(
            () => {
                return {
                    status: 'success',
                    message: 'Success',
                };
            },
            (error: HttpErrorPromise) => {
                return {
                    status: 'error',
                    message: this.generateErrorMessage(error),
                };
            }
        );
    }

    async query(options: DataQueryRequest<AkenzaQuery>): Promise<DataQueryResponse> {
        const from: DateTime = options.range.from;
        const to: DateTime = options.range.to;
        const panelData: MutableDataFrame[] = [];
        for (let target of options.targets) {
            if (target.deviceId && target.topic && target.dataKey && !target.hide) {
                const timeSeriesData = await this.getTimeSeriesData(target, from.toISOString(), to.toISOString());
                const data: number[] = [];
                const time: number[] = [];
                for (let dataPoint of timeSeriesData.dataPoints) {
                    // first entry in the array is always the value
                    data.push(dataPoint[0]);
                    // converts the ISO String to unix timestamp
                    time.push(dateTime(dataPoint[1]).valueOf());
                }
                panelData.push(
                    new MutableDataFrame({
                        refId: target.refId,
                        fields: [
                            { name: 'Time', values: time, type: FieldType.time },
                            {
                                name: target.device?.name + ' - ' + target.dataKey,
                                values: data,
                                type: FieldType.number,
                            },
                        ],
                    })
                );
            }
        }

        return { data: panelData };
    }

    async getTimeSeriesData(query: AkenzaQuery, from: string, to: string): Promise<TimeSeriesData> {
        const body = {
            dataKey: query.dataKey,
            topic: query.topic,
            timestamp: {
                gte: from,
                lte: to,
            },
        };

        return this.doRequest('/v3/devices/' + query.deviceId + '/query/time-series', 'POST', null, body).then(
            (timeSeriesData: HttpPromise<TimeSeriesData>) => {
                return timeSeriesData.data;
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    async getDevices(searchString?: string): Promise<Device[]> {
        return this.getOrganization().then(
            (organization) => {
                const params = {
                    organizationId: organization.id,
                    type: 'DEVICE',
                    search: searchString,
                };

                return this.doRequest('/v3/assets', 'GET', params).then(
                    (assetListHttpPromise: HttpPromise<DeviceList>) => {
                        return assetListHttpPromise.data.content;
                    },
                    (error: HttpErrorPromise) => {
                        throw this.generateErrorMessage(error);
                    }
                );
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    async getDevicesForOptions(search: string): Promise<Array<SelectableValue<string>>> {
        console.log(search);

        return this.getOrganization().then(
            (organization) => {
                const params = {
                    organizationId: organization.id,
                    type: 'DEVICE',
                };

                return this.doRequest('/v3/assets', 'GET', params).then(
                    (assetListHttpPromise: HttpPromise<DeviceList>) => {
                        const deviceSelectOptions: Array<SelectableValue<string>> = [];

                        for (const asset of assetListHttpPromise.data.content) {
                            deviceSelectOptions.push({ label: asset.name, value: asset.id, asset: asset });
                        }

                        console.log(deviceSelectOptions);

                        return deviceSelectOptions;
                    },
                    (error: HttpErrorPromise) => {
                        throw this.generateErrorMessage(error);
                    }
                );
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    async getTopics(assetId: string): Promise<string[]> {
        return this.doRequest('/v3/devices/' + assetId + '/query/topics', 'GET').then(
            (topics: HttpPromise<string[]>) => {
                return topics.data;
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    async getKeys(assetId: string, topic: string): Promise<string[]> {
        const queryOptions = {
            topic: topic,
            limit: 1,
            skip: 0,
        };

        return this.doRequest('/v3/devices/' + assetId + '/query', 'POST', null, queryOptions).then(
            (res: HttpPromise<DeviceData[]>) => {
                const keys: string[] = [];
                Object.keys(res.data[0].data).forEach((key) => keys.push(key));
                return keys;
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    private async getOrganization(): Promise<Organization> {
        const params = {
            size: 1,
            minimal: true,
        };

        return this.doRequest('/v3/organizations', 'GET', params).then(
            (environmentListHttpPromise: HttpPromise<OrganizationList>) => {
                return environmentListHttpPromise.data.content[0];
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    private doRequest(path: string, method: string, params?: any, data?: any) {
        const options: BackendSrvRequest = {
            url: buildUrl(this.config.baseUrl, { path }),
            method,
            params,
            data,
            headers: {
                'x-api-key': this.config.apiKey,
            },
        };

        return getBackendSrv().datasourceRequest(options);
    }

    private generateErrorMessage(error: HttpErrorPromise) {
        if (error.status === 401) {
            return '401 Unauthorized - Specified API Key is invalid';
        } else if (error.statusText && error.data?.message) {
            return error.status + ' ' + error.statusText + ': ' + error.data.message;
        } else {
            return 'An unknown error occurred, please contact Akenza Support: support@akenza.io';
        }
    }
}
