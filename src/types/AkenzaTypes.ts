export interface Device {
    id: string;
    name: string;
    // other properties omitted, because they're not used
}

export interface DeviceList {
    content: Device[];
    // other properties omitted, because they're not used
}

export interface DeviceData {
    deviceId: string;
    timestamp: string;
    topic: string;
    data: any;
    // other properties omitted, because they're not used
}

export interface TimeSeriesData {
    dataPoints: any[];
    key: string;
}

export interface OrganizationList {
    content: Organization[];
    // other properties omitted, because they're not used
}

export interface Organization {
    id: string;
    name: string;
    // other properties omitted, because they're not used
}

export interface AccessCheckParams {
    organizationId: undefined | string,
    type: string,
    search: undefined | string,
    workspaceIds: undefined | string[],
}

export interface AccessCheckResponse {
    all: boolean;
    ids: string[];
}
