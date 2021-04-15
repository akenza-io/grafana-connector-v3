import React, { PureComponent } from 'react';
import { HorizontalGroup, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { Device } from './types/AkenzaTypes';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';
import { QueryEditorState } from './types/Utils';
import { Subject } from 'rxjs';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/switchMap';

type Props = QueryEditorProps<DataSource, AkenzaQuery, AkenzaDataSourceConfig>;

export class QueryEditor extends PureComponent<Props, QueryEditorState> {
    private initialLoadingComplete = false;
    private dataSourceId: number;
    private search = new Subject<string>();

    constructor(props: Props) {
        super(props);
        const query = this.props.query;
        // initialize the select values and their options if the panel has been saved before, will initialize empty otherwise
        // initialize as undefined since it otherwise counts as already a selected value...
        let deviceSelectValue = undefined;
        let deviceSelectOptions = [];
        if (query.device) {
            deviceSelectValue =  {
                label: query.device.name,
                value: query.deviceId,
                asset: query.device,
            };
            deviceSelectOptions.push(deviceSelectValue);
        }
        // initialize as undefined since it otherwise counts as already a selected value...
        let topicSelectValue = undefined;
        let topicSelectOptions = [];
        if (query.topic) {
            topicSelectValue =  {
                label: query.topic,
                value: query.topic,
            };
            topicSelectOptions.push(topicSelectValue);
        }
        // initialize as undefined since it otherwise counts as already a selected value...
        let dataKeySelectValue = undefined;
        let dataKeySelectOptions = [];
        if (query.dataKey) {
            dataKeySelectValue = {
                label: query.dataKey,
                value: query.dataKey,
            };
            dataKeySelectOptions.push(dataKeySelectValue);
        }

        this.state = {
            deviceValue: deviceSelectValue,
            deviceOptions: deviceSelectOptions,
            topicValue: topicSelectValue,
            topicOptions: topicSelectOptions,
            dataKeyValue: dataKeySelectValue,
            dataKeyOptions: dataKeySelectOptions,
            loadingDevices: false,
            loadingTopics: false,
            loadingDataKeys: false,
        };

        this.loadDevices();
        // load topics and queries if the panel has been saved
        if (query.deviceId && query.topic) {
            this.loadTopicsAndAssembleSelectionOptions(query.deviceId);
            this.loadDataKeysAndAssembleSelectionOptions(query.deviceId, query.topic);
        }

        this.initializeSearchInputSubscription();
        this.dataSourceId = this.props.datasource.id;
    }

    private initializeSearchInputSubscription(): void {
        this.search
            // wait for 250ms after the user has finished typing
            .debounceTime(250)
            .distinctUntilChanged()
            // subscribe and update the device options
            .subscribe((searchString) => {
                this.queryDevicesAndAssembleSelectionOptions(searchString, true);
            });
    }

    private queryDevicesAndAssembleSelectionOptions(searchString?: string, skipStateUpdate?: boolean) {
        if (!skipStateUpdate) {
            this.setLoadingDevicesState(true);
        }

        this.props.datasource.getDevices(searchString).then(
            (devices: Device[]) => {
                const deviceSelectOptions: Array<SelectableValue<string>> = [];

                for (const device of devices) {
                    deviceSelectOptions.push({ label: device.name, value: device.id, device });
                }
                this.setState((prevState) => ({
                    ...prevState,
                    deviceOptions: deviceSelectOptions,
                }));
                this.initialLoadingComplete = true;
                this.setLoadingDevicesState(false);
                // initial render does not update the select loading state, hence the force update
                // it won't trigger a re-rendering of the view, since the above checks prevent this
                // this.forceUpdate();
            },
            // in case an error is thrown, stop the loading animation
            () => {
                this.setLoadingDevicesState(false);
            }
        );
    }

    private loadDevices(): void {
        // render() is called multiple times, in order to avoid spam calling our API this check has been put into place
        if (!this.state.loadingDevices && this.dataSourceId !== this.props.datasource.id) {
            if (this.dataSourceId !== this.props.datasource.id && this.initialLoadingComplete) {
                this.resetAllValues();
                this.dataSourceId = this.props.datasource.id;
            }
            this.queryDevicesAndAssembleSelectionOptions();
        }
    }

    private loadTopicsAndAssembleSelectionOptions(deviceId: string, resetValues?: boolean): void {
        this.setLoadingTopicsState(true);
        this.props.datasource.getTopics(deviceId).then(
            (topics: string[]) => {
                if (resetValues) {
                    this.resetTopicAndDataKeyValues();
                }
                let topicsSelectOptions: Array<SelectableValue<string>> = [];
                for (const topic of topics) {
                    topicsSelectOptions.push({ label: topic, value: topic });
                }
                this.setLoadingTopicsState(false);

                this.setState((prevState) => ({
                    ...prevState,
                    topicOptions: topicsSelectOptions,
                    topicValue: undefined,
                }));
                if (topicsSelectOptions.length === 0) {
                    // if no topics were found, reset dataKey and topic values options
                    this.resetTopicAndDataKeyValues();
                }
            },
            // in case an error is thrown, stop the loading animation
            () => {
                this.setLoadingTopicsState(false);
            }
        );
    }

    private loadDataKeysAndAssembleSelectionOptions(assetId: string, topic: string): void {
        this.setLoadingDataKeysState(true);
        this.props.datasource.getKeys(assetId, topic).then(
            (keys: string[]) => {
                let keySelectOptions: Array<SelectableValue<string>> = [];
                for (const key of keys) {
                    keySelectOptions.push({ label: key, value: key });
                }
                this.setLoadingDataKeysState(false);

                this.setState((prevState) => ({
                    ...prevState,
                    dataKeyOptions: keySelectOptions,
                    dataKeyValue: undefined,
                }));
            },
            // in case an error is thrown, stop the loading animation
            () => {
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
        // this.loadDevices();

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
                            backspaceRemovesValue={true}
                            isClearable={true}
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
        if (searchString) {
            this.setLoadingDevicesState(true);
        }
        // emit the search string in the search subject
        this.search.next(searchString);
    };

    onDeviceSelectionChange = (event: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({
            ...query,
            deviceId: event?.value,
            device: event?.device,
        });

        this.setState((prevState) => ({
            ...prevState,
            deviceValue: event,
        }));

        if (event?.value) {
            // load the topics if the event contains a device id
            this.loadTopicsAndAssembleSelectionOptions(event.value, true);
        }
        // execute the query
        onRunQuery();
    };

    onTopicSelectionChange = (event: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({
            ...query,
            topic: event.value,
        });
        this.setState((prevState) => ({
            ...prevState,
            topicValue: event,
        }));
        if (event.value && query.deviceId) {
            this.loadDataKeysAndAssembleSelectionOptions(query.deviceId, event.value);
        }
        // execute the query
        onRunQuery();
    };

    onDataKeySelectionChange = (event: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({
            ...query,
            dataKey: event.value,
        });
        this.setState((prevState) => ({
            ...prevState,
            dataKeyValue: event,
        }));
        // execute the query
        onRunQuery();
    };

    private resetAllValues() {
        const { onChange, query } = this.props;

        onChange({
            ...query,
            deviceId: undefined,
            device: undefined,
            topic: undefined,
            dataKey: undefined,
        });
        // setting to undefined since empty objects still counts as value somehow
        this.setState({
            deviceValue: undefined,
            deviceOptions: [],
            topicValue: undefined,
            topicOptions: [],
            dataKeyValue: undefined,
            dataKeyOptions: [],
        });
    }

    private resetTopicAndDataKeyValues() {
        const { onChange, query } = this.props;

        onChange({
            ...query,
            topic: undefined,
            dataKey: undefined,
        });

        this.setState((prevState) => ({
            ...prevState,
            topicValue: undefined,
            topicOptions: [],
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
