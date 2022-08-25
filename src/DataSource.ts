import {
    DataQueryRequest,
    DataQueryResponse,
    DataSourceApi,
    DataSourceInstanceSettings,
    DateTime,
    FieldType,
    MutableDataFrame,
    dateTime,
} from '@grafana/data';
import { BackendSrvRequest, FetchError, FetchResponse, getBackendSrv } from '@grafana/runtime';
import buildUrl from 'build-url';
import { Device, DeviceData, DeviceList, Organization, OrganizationList, TimeSeriesData } from './types/AkenzaTypes';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';
import { Observable } from 'rxjs';

const routePathSecure = '/akenza-secure';
const routePathInsecure = '/akenza-insecure';

export class DataSource extends DataSourceApi<AkenzaQuery, AkenzaDataSourceConfig> {
    private readonly url: string;

    constructor(instanceSettings: DataSourceInstanceSettings<AkenzaDataSourceConfig>) {
        super(instanceSettings);
        // backwards compatibility thing...
        // check which proxy to use based on whether the unencrypted jsonData contains the api key
        if (instanceSettings.jsonData.apiKey) {
            this.url = buildUrl(instanceSettings.url!, {path: routePathInsecure});
            console.warn("api key is stored unencrypted! update the data source to store the api key encrypted.")
        } else {
            this.url = buildUrl(instanceSettings.url!, {path: routePathSecure});
        }
    }

    async testDatasource() {
        return new Promise((resolve, reject) => {
            const params = {
                size: 1,
                minimal: true,
            };

            this.executeRequest<Organization>(
                '/v3/organizations',
                'GET',
                params)
                .subscribe({
                    next() {
                        resolve({
                            status: 'success',
                            message: 'Success',
                        })
                    },
                    error(error: FetchError) {
                        reject({
                            status: 'error',
                            message: DataSource.generateErrorMessage(error),
                        })
                    }
                });
        });
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
                // assemble the time series data to grafana compliant format
                for (let dataPoint of timeSeriesData.dataPoints) {
                    // first entry in the array is always the value
                    data.push(dataPoint[0]);
                    // convert the ISO String to unix timestamp
                    time.push(dateTime(dataPoint[1]).valueOf());
                }
                // add the data to the panel
                panelData.push(
                    new MutableDataFrame({
                        refId: target.refId,
                        fields: [
                            {
                                name: 'Time',
                                values: time,
                                type: FieldType.time
                            },
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

    async getDevices(searchString?: string): Promise<Device[]> {
        return this.getOrganization().then((organization) => {
            return new Promise((resolve, reject) => {
                const params = {
                    organizationId: organization.id,
                    type: 'DEVICE',
                    search: searchString,
                };

                this.executeRequest<DeviceList>(
                    '/v3/assets',
                    'GET',
                    params)
                    .subscribe({
                        next(response: FetchResponse<DeviceList>) {
                            resolve(response.data.content)
                        },
                        error(error: FetchError) {
                            reject(DataSource.generateErrorMessage(error))
                        }
                    });
            });
        });
    }

    async getTopics(deviceId: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.executeRequest<string[]>(
                '/v3/devices/' + deviceId + '/query/topics',
                'GET')
                .subscribe({
                    next(response: FetchResponse<string[]>) {
                        resolve(response.data)
                    },
                    error(error: FetchError) {
                        reject(DataSource.generateErrorMessage(error))
                    }
                });
        });
    }

    async getKeys(deviceId: string, topic: string): Promise<string[]> {
        const body = {
            topic: topic,
            limit: 1,
            skip: 0,
        };

        return new Promise((resolve, reject) => {
            this.executeRequest<DeviceData[]>(
                '/v3/devices/' + deviceId + '/query',
                'POST',
                null,
                body)
                .subscribe({
                    next(response: FetchResponse<DeviceData[]>) {
                        const keys: string[] = [];
                        Object.keys(response.data[0].data).forEach((key) => keys.push(key));
                        resolve(keys);
                    },
                    error(error: FetchError) {
                        reject(DataSource.generateErrorMessage(error))
                    }
                });
        });
    }

    private async getTimeSeriesData(query: AkenzaQuery, from: string, to: string): Promise<TimeSeriesData> {
        const body = {
            dataKey: query.dataKey,
            topic: query.topic,
            timestamp: {
                gte: from,
                lte: to,
            },
        };

        return new Promise((resolve, reject) => {
            this.executeRequest<TimeSeriesData>(
                '/v3/devices/' + query.deviceId + '/query/time-series',
                'POST',
                null,
                body)
                .subscribe({
                    next(response: FetchResponse<TimeSeriesData>) {
                        resolve(response.data)
                    },
                    error(error: FetchError) {
                        reject(DataSource.generateErrorMessage(error))
                    }
                });
        });
    }

    private async getOrganization(): Promise<Organization> {
        const params = {
            size: 1,
            minimal: true,
        };

        return new Promise((resolve, reject) => {
            this.executeRequest<DeviceList>(
                '/v3/organizations',
                'GET',
                params)
                .subscribe({
                    next(response: FetchResponse<OrganizationList>) {
                        resolve(response.data.content[0]);
                    },
                    error(error: FetchError) {
                        reject(DataSource.generateErrorMessage(error))
                    }
                });
        });
    }

    private executeRequest<T>(path: string, method: string, params?: any, data?: any): Observable<FetchResponse<T>> {
        const options: BackendSrvRequest = {
            url: buildUrl(this.url, { path }),
            method,
            params,
            data,
        };

        return getBackendSrv().fetch(options);
    }

    private static generateErrorMessage(error: FetchError): string {
        if (error.status === 401) {
            return '401 Unauthorized - Specified API Key is invalid';
        } else if (error.statusText && error.data?.message) {
            return error.status + ' ' + error.statusText + ': ' + error.data.message;
        } else {
            return 'An unknown error occurred, please contact our support: support@akenza.io';
        }
    }
}
