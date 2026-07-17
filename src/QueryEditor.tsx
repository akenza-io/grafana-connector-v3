import React, { PureComponent } from 'react';
import { Combobox, ComboboxOption, Stack } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './DataSource';
import { Device } from './types/AkenzaTypes';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';
import { QueryEditorState } from './types/Utils';

type Props = QueryEditorProps<DataSource, AkenzaQuery, AkenzaDataSourceConfig>;

interface Callback {
    (): void;
}

export class QueryEditor extends PureComponent<Props, QueryEditorState> {
    private initialLoadingComplete = false;
    private dataSourceId: string;

    constructor(props: Props) {
        super(props);
        const query = this.props.query;
        // initialize the select values and their options if the panel has been saved before, will initialize empty otherwise
        const deviceSelectValue = {
            label: query.device?.name || "",
            value: query.deviceId || ""
        };
    
        const topicSelectValue = {
            label: query.topic || "",
            value: query.topic || "",
        };
        const dataKeySelectValue = {
            label: query.dataKey || "",
            value: query.dataKey || "",
        };
        // initialize the state
        this.state = {
            deviceValue: deviceSelectValue,
            deviceOptions: [deviceSelectValue],
            topicValue: topicSelectValue,
            topicOptions: [topicSelectValue],
            dataKeyValue: dataKeySelectValue,
            dataKeyOptions: [dataKeySelectValue],
            loadingDevices: false,
            loadingTopics: false,
            loadingDataKeys: false,
            devices: []
        };
        // other view initializations
        this.initializeDeviceSelection();
        this.dataSourceId = this.props.datasource.uid;
    }

    private initializeDeviceSelection(): void {
        const {query} = this.props;
        // render() is called multiple times, in order to avoid spam calling our API this check has been put into place
        if (!this.state.loadingDevices && this.dataSourceId !== this.props.datasource.uid) {
            if (this.dataSourceId !== this.props.datasource.uid && this.initialLoadingComplete) {
                this.resetAllValues();
                this.dataSourceId = this.props.datasource.uid;
            }
            // load the device list
            this.queryDevicesAndAssembleSelectionOptions(undefined, false, () => {
                if (query.deviceId && query.topic) {
                    // query contains values if the panel was saved at some point, meaning the topic and data key selection should be loaded as well
                    this.loadTopicsAndAssembleSelectionOptions(query.deviceId!, () => {
                        this.loadDataKeysAndAssembleSelectionOptions(query.deviceId!, query.topic!, () => {
                            // set the initial loading state once everything has been loaded
                            this.initialLoadingComplete = true;
                        });
                    });
                } else {
                    this.initialLoadingComplete = true;
                }
            });
        }
    }

    private queryDevicesAndAssembleSelectionOptions(
        searchString?: string,
        skipStateUpdate?: boolean,
        callback?: Callback
    ) {
        // the loading state should not be shown under certain circumstances
        if (!skipStateUpdate) {
            this.setLoadingDevicesState(true);
        }

        this.props.datasource.getDevices(searchString).then(
            (devices: Device[]) => {
                const deviceSelectOptions: Array<ComboboxOption<string>> = [];
                for (const device of devices) {
                    deviceSelectOptions.push({label: device.name, value: device.id});
                }
        
                // modify the state
                this.setState((prevState) => ({
                    ...prevState,
                    deviceOptions: deviceSelectOptions,
                    devices: devices
                }));
                // execute the callback if set
                if (callback) {
                    callback();
                }
                this.setLoadingDevicesState(false);
            },
            // in case an error is thrown, stop the loading animation
            () => {
                this.setLoadingDevicesState(false);
            }
        );
    }

    // called by the Combobox when it opens and on every keystroke, with the current search query
    private loadDeviceOptions = (searchString: string): Promise<Array<ComboboxOption<string>>> => {
        return this.props.datasource.getDevices(searchString).then((devices: Device[]) => {
            this.setState((prevState) => ({
                ...prevState,
                devices,
            }));
            return devices.map((device) => ({ label: device.name, value: device.id }));
        });
    };

    private loadTopicsAndAssembleSelectionOptions(deviceId: string, callback?: Callback): void {
        this.setLoadingTopicsState(true);
        this.props.datasource.getTopics(deviceId).then(
            (topics: string[]) => {
                let topicsSelectOptions: Array<ComboboxOption<string>> = [];
                for (const topic of topics) {
                    topicsSelectOptions.push({label: topic, value: topic});
                }
                // reset the values only after initial loading was completed, will reset it again otherwise due to react lifecycles
                if (this.initialLoadingComplete) {
                    this.resetTopicAndDataKeyValues(topicsSelectOptions);
                }
                if (callback) {
                    callback();
                }
                this.setLoadingTopicsState(false);
            },
            () => {
                // in case an error is thrown, stop the loading animation
                this.setLoadingTopicsState(false);
            }
        );
    }

    private loadDataKeysAndAssembleSelectionOptions(deviceId: string, topic: string, callback?: Callback): void {
        this.setLoadingDataKeysState(true);
        this.props.datasource.getKeys(deviceId, topic).then(
            (keys: string[]) => {
                let keySelectOptions: Array<ComboboxOption<string>> = [];
                for (const key of keys) {
                    keySelectOptions.push({label: key, value: key});
                }
                // reset the values only after initial loading was completed, will reset it again otherwise due to react lifecycles
                if (this.initialLoadingComplete) {
                    this.setState((prevState) => ({
                        ...prevState,
                        dataKeyOptions: keySelectOptions,
                        dataKeyValue: { label: "", value: ""},
                    }));
                }
                if (callback) {
                    callback();
                }
                this.setLoadingDataKeysState(false);
            },
            () => {
                // in case an error is thrown, stop the loading animation
                this.setLoadingDataKeysState(false);
            }
        );
    }

    render() {
        const {
            loadingDevices,
            loadingTopics,
            loadingDataKeys,
            deviceValue,
            dataKeyOptions,
            dataKeyValue,
            topicOptions,
            topicValue,
        } = this.state;
        const {query} = this.props;

        return (
            <div className="gf-form">
                <Stack wrap={true}>
                    <Stack>
                        <div className="gf-form-label">Device:</div>
                        <Combobox
                            loading={loadingDevices}
                            placeholder={'Select a device'}
                            options={this.loadDeviceOptions}
                            value={deviceValue}
                            onChange={this.onDeviceSelectionChange}
                            width={48}
                        />
                    </Stack>
                    <Stack>
                        <div className="gf-form-label">Topic:</div>
                        <Combobox
                            disabled={!query.deviceId}
                            loading={loadingTopics}
                            placeholder={'Select a topic'}
                            options={topicOptions}
                            value={topicValue}
                            onChange={this.onTopicSelectionChange}
                            width={24}
                        />
                    </Stack>
                    <Stack>
                        <div className="gf-form-label">Data Key:</div>
                        <Combobox
                            disabled={!query.topic}
                            loading={loadingDataKeys}
                            placeholder={'Select a data key'}
                            options={dataKeyOptions}
                            value={dataKeyValue}
                            onChange={this.onDataKeySelectionChange}
                            width={24}
                        />
                    </Stack>
                </Stack>
            </div>
        );
    }

    onDeviceSelectionChange = (deviceSelection: ComboboxOption<string>): void => {
        const {onChange, query, onRunQuery} = this.props;
        // check if the same value was selected again (no need to re-trigger any updates in this case)
        if (deviceSelection?.value !== query.deviceId) {
            
            const device = this.state.devices.find((d: Device)  => d.id === deviceSelection?.value)
            // modify the query
            onChange({
                ...query,
                deviceId: deviceSelection?.value,
                device: device
            });
            // modify the state
            this.setState((prevState) => ({
                ...prevState,
                deviceValue: deviceSelection,
            }));
            // load the topics if the event contains a device id
            if (deviceSelection?.value) {
                this.loadTopicsAndAssembleSelectionOptions(deviceSelection.value);
            }
            // execute the query
            onRunQuery();
        }
    };

    onTopicSelectionChange = (topicSelection: ComboboxOption<string>): void => {
        const {onChange, query, onRunQuery} = this.props;
        // check if the same value was selected again (no need to re-trigger any updates in this case)
        if (topicSelection?.value !== query.topic) {
            // modify the query
            onChange({
                ...query,
                topic: topicSelection.value,
            });
            // modify the state
            this.setState((prevState) => ({
                ...prevState,
                topicValue: topicSelection,
            }));
            // load data keys if the topic and the deviceId are present
            if (topicSelection.value && query.deviceId) {
                this.loadDataKeysAndAssembleSelectionOptions(query.deviceId, topicSelection.value);
            }
            // execute the query
            onRunQuery();
        }
    };

    onDataKeySelectionChange = (dataKeySelection: ComboboxOption<string>): void => {
        const {onChange, query, onRunQuery} = this.props;
        // check if the same value was selected again (no need to re-trigger any updates in this case)
        if (dataKeySelection?.value !== query.dataKey) {
            // modify the query
            onChange({
                ...query,
                dataKey: dataKeySelection.value,
            });
            // modify the state
            this.setState((prevState) => ({
                ...prevState,
                dataKeyValue: dataKeySelection,
            }));
            // execute the query
            onRunQuery();
        }
    };

    private resetAllValues() {
        const {onChange, query} = this.props;
        // modify the query
        onChange({
            ...query,
            deviceId: '',
            device: undefined,
            topic: '',
            dataKey: '',
        });
        // reset the state
        this.setState({
            deviceValue: undefined,
            deviceOptions: [],
            topicValue: undefined,
            topicOptions: [],
            dataKeyValue: undefined,
            dataKeyOptions: [],
        });
    }

    private resetTopicAndDataKeyValues(topicsOptions: Array<ComboboxOption<string>>) {
        const {onChange, query} = this.props;

        onChange({
            ...query,
            topic: '',
            dataKey: '',
        });

        this.setState((prevState) => ({
            ...prevState,
            topicValue: undefined,
            topicOptions: topicsOptions,
            dataKeyValue: undefined,
            dataKeyOptions: [],
        }));
    }

    private setLoadingDevicesState(isLoading: boolean) {
        this.setState((prevState) => ({
            ...prevState,
            loadingDevices: isLoading,
        }));
    }

    private setLoadingTopicsState(isLoading: boolean) {
        this.setState((prevState) => ({
            ...prevState,
            loadingTopics: isLoading,
        }));
    }

    private setLoadingDataKeysState(isLoading: boolean) {
        this.setState((prevState) => ({
            ...prevState,
            loadingDataKeys: isLoading,
        }));
    }
}
