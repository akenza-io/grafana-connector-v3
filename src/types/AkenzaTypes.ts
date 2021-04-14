export interface Asset {
    id: string;
    name: string;
    // no other properties since the API call is made using the fields param
}

export interface AssetList {
    offset: number;
    limit: number;
    total: number;
    data: Asset[];
}

export interface AssetData {
    deviceId: string;
    timestamp: string;
    topic: string;
    data: any;
}

export interface TimeSeriesData {
    dataPoints: any[];
    key: string;
}

export interface Environment {
    id: string;
    name: string;
    // other properties omitted
}

export interface EnvironmentList {
    offset: number;
    limit: number;
    total: number;
    data: Environment[];
}
