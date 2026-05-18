import { Device } from './AkenzaTypes';
import { ComboboxOption } from '@grafana/ui';

export interface QueryEditorState {
    deviceValue?: ComboboxOption;
    deviceOptions: ComboboxOption[];
    topicValue?: ComboboxOption;
    topicOptions: ComboboxOption[];
    dataKeyValue?: ComboboxOption;
    dataKeyOptions: ComboboxOption[];
    loadingDevices: boolean;
    loadingTopics: boolean;
    loadingDataKeys: boolean;
    devices: Device[]
}
