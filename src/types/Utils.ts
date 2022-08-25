import { SelectableValue } from '@grafana/data';

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
