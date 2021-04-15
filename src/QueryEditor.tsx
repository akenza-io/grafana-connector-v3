import React, { PureComponent } from 'react';
import { HorizontalGroup, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { Device } from './types/AkenzaTypes';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';
import { QueryEditorState } from './types/Utils';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

type Props = QueryEditorProps<DataSource, AkenzaQuery, AkenzaDataSourceConfig>;
interface Callback {
    (): void;
}

export class QueryEditor extends PureComponent<Props, QueryEditorState> {
    private initialLoadingComplete = false;
    private dataSourceId: number;
    private search = new Subject<string>();

    constructor(props: Props) {
        super(props);
        const query = this.props.query;
        // initialize the select values and their options if the panel has been saved before, will initialize empty otherwise
        const deviceSelectValue = {
            label: query.device?.name || undefined,
            value: query.deviceId || null,
            asset: query.device,
        };
        const topicSelectValue = {
            label: query.topic,
            value: query.topic || null,
        };
        const dataKeySelectValue = {
            label: query.dataKey,
            value: query.dataKey || null,
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
        };
        // other view initializations
        this.initializeDeviceSelection();
        this.initializeSearchInputSubscription();
        this.dataSourceId = this.props.datasource.id;
    }

    private initializeSearchInputSubscription(): void {
        this.search
            // wait for 250ms after the user has finished typing
            .pipe(debounceTime(250), distinctUntilChanged())
            // subscribe and update the device options
            .subscribe((searchString) => {
                this.queryDevicesAndAssembleSelectionOptions(searchString, true);
            });
    }

    private initializeDeviceSelection(): void {
        const { query } = this.props;
        // render() is called multiple times, in order to avoid spam calling our API this check has been put into place
        if (!this.state.loadingDevices && this.dataSourceId !== this.props.datasource.id) {
            if (this.dataSourceId !== this.props.datasource.id && this.initialLoadingComplete) {
                this.resetAllValues();
                this.dataSourceId = this.props.datasource.id;
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
                const deviceSelectOptions: Array<SelectableValue<string>> = [];
                for (const device of devices) {
                    deviceSelectOptions.push({ label: device.name, value: device.id, device });
                }
                // modify the state
                this.setState((prevState) => ({
                    ...prevState,
                    deviceOptions: deviceSelectOptions,
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

    private loadTopicsAndAssembleSelectionOptions(deviceId: string, callback?: Callback): void {
        this.setLoadingTopicsState(true);
        this.props.datasource.getTopics(deviceId).then(
            (topics: string[]) => {
                let topicsSelectOptions: Array<SelectableValue<string>> = [];
                for (const topic of topics) {
                    topicsSelectOptions.push({ label: topic, value: topic });
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
                let keySelectOptions: Array<SelectableValue<string>> = [];
                for (const key of keys) {
                    keySelectOptions.push({ label: key, value: key });
                }
                // reset the values only after initial loading was completed, will reset it again otherwise due to react lifecycles
                if (this.initialLoadingComplete) {
                    this.setState((prevState) => ({
                        ...prevState,
                        dataKeyOptions: keySelectOptions,
                        dataKeyValue: {},
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
            deviceOptions,
            deviceValue,
            dataKeyOptions,
            dataKeyValue,
            topicOptions,
            topicValue,
        } = this.state;
        const { query } = this.props;

        return (
            <div className="gf-form">
                <HorizontalGroup spacing={'md'} wrap={true}>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label">Device:</div>
                        <Select
                            menuPlacement={'bottom'}
                            isLoading={loadingDevices}
                            placeholder={'Select a device'}
                            noOptionsMessage={'No devices available'}
                            options={deviceOptions}
                            value={deviceValue}
                            onChange={this.onDeviceSelectionChange}
                            width={48}
                            onInputChange={this.onDeviceInputChange}
                        />
                    </HorizontalGroup>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label">Topic:</div>
                        <Select
                            menuPlacement={'bottom'}
                            disabled={!query.deviceId}
                            isLoading={loadingTopics}
                            placeholder={'Select a topic'}
                            noOptionsMessage={'No topics available'}
                            options={topicOptions}
                            value={topicValue}
                            onChange={this.onTopicSelectionChange}
                            width={24}
                        />
                    </HorizontalGroup>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label">Data Key:</div>
                        <Select
                            menuPlacement={'bottom'}
                            disabled={!query.topic}
                            isLoading={loadingDataKeys}
                            placeholder={'Select a data key'}
                            noOptionsMessage={'No data keys available'}
                            options={dataKeyOptions}
                            value={dataKeyValue}
                            onChange={this.onDataKeySelectionChange}
                            width={24}
                        />
                    </HorizontalGroup>
                </HorizontalGroup>
            </div>
        );
    }

    onDeviceInputChange = (searchString: string): void => {
        // only set the loading state if the search string is present
        // due to react lifecycles this triggers if the user leaves the input field (which loads the initial list again)
        // in order to not show the loading indicator at that point, it is simply not modified if the search string is empty
        if (searchString) {
            this.setLoadingDevicesState(true);
        }
        // emit the search string in the search subject
        this.search.next(searchString);
    };

    onDeviceSelectionChange = (deviceSelection: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
        // check if the same value was selected again (no need to re-trigger any updates in this case)
        if (deviceSelection?.value !== query.deviceId) {
            // modify the query
            onChange({
                ...query,
                deviceId: deviceSelection?.value,
                device: deviceSelection?.device,
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

    onTopicSelectionChange = (topicSelection: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
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

    onDataKeySelectionChange = (dataKeySelection: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
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
        const { onChange, query } = this.props;
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
            deviceValue: {},
            deviceOptions: [],
            topicValue: {},
            topicOptions: [],
            dataKeyValue: {},
            dataKeyOptions: [],
        });
    }

    private resetTopicAndDataKeyValues(topicsOptions: Array<SelectableValue<string>>) {
        const { onChange, query } = this.props;

        onChange({
            ...query,
            topic: '',
            dataKey: '',
        });

        this.setState((prevState) => ({
            ...prevState,
            topicValue: {},
            topicOptions: topicsOptions,
            dataKeyValue: {},
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
