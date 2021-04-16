import { SelectableValue } from '@grafana/data';

export interface HttpPromise<T> {
    status: number;
    statusText: string;
    xhrStatus: string;
    data: T;
}

export interface HttpErrorPromise {
    status: number;
    statusText: string;
    data: AkenzaErrorMessage;
}

export interface AkenzaErrorMessage {
    error: string;
    errorId: string;
    message: string;
    path: string;
    requestId: string;
    status: number;
    timestamp: string;
    traceId: string;
}

export interface QueryEditorState {
    deviceValue: SelectableValue;
    deviceOptions: SelectableValue[];
    topicValue?: SelectableValue;
    topicOptions: SelectableValue[];
    dataKeyValue?: SelectableValue;
    dataKeyOptions: SelectableValue[];
    loadingDevices: boolean;
    loadingTopics: boolean;
    loadingDataKeys: boolean;
}
