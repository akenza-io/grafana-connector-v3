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

        return new Promise((resolve, reject) => {
            this.executeRequest<Organization>('/v3/organizations', 'GET', params).subscribe(
                () => {
                    resolve({
                        status: 'success',
                        message: 'Success',
                    });
                },
                (error: FetchError) => {
                    reject({
                        status: 'error',
                        message: this.generateErrorMessage(error),
                    });
                }
            );
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

        return new Promise((resolve, reject) => {
            this.executeRequest<TimeSeriesData>(
                '/v3/devices/' + query.deviceId + '/query/time-series',
                'POST',
                null,
                body
            ).subscribe(
                (response: FetchResponse<TimeSeriesData>) => {
                    resolve(response.data);
                },
                (error: FetchError) => {
                    reject(this.generateErrorMessage(error));
                }
            );
        });
    }

    async getDevices(searchString?: string): Promise<Device[]> {
        return this.getOrganization().then((organization) => {
            return new Promise((resolve, reject) => {
                const params = {
                    organizationId: organization.id,
                    type: 'DEVICE',
                    search: searchString,
                };

                this.executeRequest<DeviceList>('/v3/assets', 'GET', params).subscribe(
                    (response: FetchResponse<DeviceList>) => {
                        resolve(response.data.content);
                    },
                    (error: FetchError) => {
                        reject(this.generateErrorMessage(error));
                    }
                );
            });
        });
    }

    async getTopics(assetId: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.executeRequest<string[]>('/v3/devices/' + assetId + '/query/topics', 'GET').subscribe(
                (response: FetchResponse<string[]>) => {
                    resolve(response.data);
                },
                (error: FetchError) => {
                    reject(this.generateErrorMessage(error));
                }
            );
        });
    }

    async getKeys(assetId: string, topic: string): Promise<string[]> {
        const params = {
            topic: topic,
            limit: 1,
            skip: 0,
        };
        const keys: string[] = [];

        return new Promise((resolve, reject) => {
            this.executeRequest<DeviceData[]>('/v3/devices/' + assetId + '/query', 'POST', null, params).subscribe(
                (response: FetchResponse<DeviceData[]>) => {
                    Object.keys(response.data[0].data).forEach((key) => keys.push(key));
                    resolve(keys);
                },
                (error: FetchError) => {
                    reject(this.generateErrorMessage(error));
                }
            );
        });
    }

    private getOrganization(): Promise<Organization> {
        const params = {
            size: 1,
            minimal: true,
        };

        return new Promise((resolve, reject) => {
            this.executeRequest<DeviceList>('/v3/organizations', 'GET', params).subscribe(
                (response: FetchResponse<OrganizationList>) => {
                    resolve(response.data.content[0]);
                },
                (error: FetchError) => {
                    reject(this.generateErrorMessage(error));
                }
            );
        });
    }

    private executeRequest<T>(path: string, method: string, params?: any, data?: any): Observable<FetchResponse<T>> {
        const options: BackendSrvRequest = {
            url: buildUrl(this.config.baseUrl, { path }),
            method,
            params,
            data,
            headers: {
                'x-api-key': this.config.apiKey,
            },
        };

        return getBackendSrv().fetch(options);
    }

    private generateErrorMessage(error: FetchError): string {
        if (error.status === 401) {
            return '401 Unauthorized - Specified API Key is invalid';
        } else if (error.statusText && error.data?.message) {
            return error.status + ' ' + error.statusText + ': ' + error.data.message;
        } else {
            return 'An unknown error occurred, please contact our support: support@akenza.io';
        }
    }
}
