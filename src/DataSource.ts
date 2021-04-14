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
import { BackendSrvRequest, getBackendSrv } from '@grafana/runtime';
import buildUrl from 'build-url';
import { Asset, AssetData, AssetList, Environment, EnvironmentList, TimeSeriesData } from './types/AkenzaTypes';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';
import { HttpErrorPromise, HttpPromise } from './types/Utils';

export class DataSource extends DataSourceApi<AkenzaQuery, AkenzaDataSourceConfig> {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(instanceSettings: DataSourceInstanceSettings<AkenzaDataSourceConfig>) {
        super(instanceSettings);
        this.baseUrl = instanceSettings.jsonData.baseUrl;
        this.apiKey = instanceSettings.jsonData.apiKey;
    }

    async testDatasource() {
        return this.doRequest('/v1/environments', 'GET').then(
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
            if (target.assetId && target.topic && target.dataKey && !target.hide) {
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
                            { name: target.asset?.name + ' - ' + target.dataKey, values: data, type: FieldType.number },
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

        return this.doRequest('/v2/assets/' + query.assetId + '/query/time-series', 'POST', null, body).then(
            (timeSeriesData: HttpPromise<TimeSeriesData>) => {
                return timeSeriesData.data;
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    async getAssets(): Promise<Asset[]> {
        const params = {
            limit: 1000,
            // has to be a string, since the backendSrv just calls toString() on it which results in [Object object] and an API error...
            fields: '{"id": true, "name": true}',
        };

        return this.getEnvironment().then(
            environment => {
                return this.doRequest('/v2/environments/' + environment.id + '/devices', 'GET', params).then(
                    (assetListHttpPromise: HttpPromise<AssetList>) => {
                        return assetListHttpPromise.data.data;
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
        return this.doRequest('/v2/assets/' + assetId + '/query/topics', 'GET').then(
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

        return this.doRequest('/v2/assets/' + assetId + '/query', 'POST', null, queryOptions).then(
            (res: HttpPromise<AssetData[]>) => {
                const keys: string[] = [];
                Object.keys(res.data[0].data).forEach(key => keys.push(key));
                return keys;
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    private async getEnvironment(): Promise<Environment> {
        return this.doRequest('/v1/environments', 'GET').then(
            (environmentListHttpPromise: HttpPromise<EnvironmentList>) => {
                return environmentListHttpPromise.data.data[0];
            },
            (error: HttpErrorPromise) => {
                throw this.generateErrorMessage(error);
            }
        );
    }

    private doRequest(path: string, method: string, params?: any, data?: any) {
        const options: BackendSrvRequest = {
            url: buildUrl(this.baseUrl, { path }),
            method,
            params,
            data,
            headers: {
                'Api-Key': this.apiKey,
            },
        };

        return getBackendSrv().datasourceRequest(options);
    }

    private generateErrorMessage(error: HttpErrorPromise) {
        if (error.status === 401) {
            return '401 Unauthorized - API Key provided is not valid';
        } else if (error.statusText && error.data?.message) {
            return error.status + ' ' + error.statusText + ': ' + error.data.message;
        } else {
            return 'An unknown error occurred, please contact Akenza Support: support@akenza.com';
        }
    }
}
