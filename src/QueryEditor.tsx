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
    private loadingDevices = false;
    private loadingTopics = false;
    private loadingDataKeys = false;
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

        this.state = {
            deviceValue: deviceSelectValue,
            deviceOptions: [deviceSelectValue],
            topicValue: topicSelectValue,
            topicOptions: [topicSelectValue],
            dataKeyValue: dataKeySelectValue,
            dataKeyOptions: [dataKeySelectValue],
        };

        this.loadDevices();
        // load topics and queries if the panel has been saved
        if (query.deviceId && query.topic) {
            this.loadTopics(query.deviceId);
            this.loadKeys(query.deviceId, query.topic);
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
                // todo figure out why the fuck this if is in place (it doesn't load anything if this statement is included...
                console.log(!this.loadingDevices, this.dataSourceId !== this.props.datasource.id);
                if (!this.loadingDevices && this.dataSourceId !== this.props.datasource.id) {
                    this.loadingDevices = true;
                    if (this.dataSourceId !== this.props.datasource.id && this.initialLoadingComplete) {
                        this.resetAllValues();
                        this.dataSourceId = this.props.datasource.id;
                    }
                    console.log(searchString);

                    this.props.datasource.getDevices(searchString).then(
                        (devices: Device[]) => {
                            const deviceSelectOptions: Array<SelectableValue<string>> = [];

                            for (const asset of devices) {
                                deviceSelectOptions.push({ label: asset.name, value: asset.id, asset: asset });
                            }
                            this.setState((prevState) => ({
                                ...prevState,
                                deviceOptions: deviceSelectOptions,
                            }));

                            this.loadingDevices = false;
                            this.initialLoadingComplete = true;
                            // initial render does not update the select loading state, hence the force update
                            // it won't trigger a re-rendering of the view, since the above checks prevent this
                            this.forceUpdate();
                        },
                        // in case an error is thrown, stop the loading animation
                        () => {
                            this.loadingDevices = false;
                        }
                    );
                }
            });
    }

    private loadDevices(searchString?: string): void {
        // render() is called multiple times, in order to avoid spam calling our API this check has been put into place
        if (!this.loadingDevices && this.dataSourceId !== this.props.datasource.id) {
            this.loadingDevices = true;
            if (this.dataSourceId !== this.props.datasource.id && this.initialLoadingComplete) {
                this.resetAllValues();
                this.dataSourceId = this.props.datasource.id;
            }
            console.log(searchString);

            this.props.datasource.getDevices(searchString).then(
                (devices: Device[]) => {
                    const deviceSelectOptions: Array<SelectableValue<string>> = [];

                    for (const asset of devices) {
                        deviceSelectOptions.push({ label: asset.name, value: asset.id, asset: asset });
                    }
                    this.setState((prevState) => ({
                        ...prevState,
                        deviceOptions: deviceSelectOptions,
                    }));

                    this.loadingDevices = false;
                    this.initialLoadingComplete = true;
                    // initial render does not update the select loading state, hence the force update
                    // it won't trigger a re-rendering of the view, since the above checks prevent this
                    this.forceUpdate();
                },
                // in case an error is thrown, stop the loading animation
                () => {
                    this.loadingDevices = false;
                }
            );
        }
    }

    private loadTopics(assetId: string): void {
        this.loadingTopics = true;
        this.props.datasource.getTopics(assetId).then(
            (topics: string[]) => {
                let topicsSelectOptions: Array<SelectableValue<string>> = [];
                for (const topic of topics) {
                    topicsSelectOptions.push({ label: topic, value: topic });
                }
                this.loadingTopics = false;
                this.setState((prevState) => ({
                    ...prevState,
                    topicOptions: topicsSelectOptions,
                }));
                if (topicsSelectOptions.length === 0) {
                    // if no topics were found, reset dataKey and topic values options
                    this.resetTopicAndDataKeyValues();
                }
            },
            // in case an error is thrown, stop the loading animation
            () => {
                this.loadingTopics = false;
            }
        );
    }

    private loadKeys(assetId: string, topic: string): void {
        this.loadingDataKeys = true;
        this.props.datasource.getKeys(assetId, topic).then(
            (keys: string[]) => {
                let keySelectOptions: Array<SelectableValue<string>> = [];
                for (const key of keys) {
                    keySelectOptions.push({ label: key, value: key });
                }
                this.loadingDataKeys = false;
                this.setState((prevState) => ({
                    ...prevState,
                    dataKeyOptions: keySelectOptions,
                }));
            },
            // in case an error is thrown, stop the loading animation
            () => {
                this.loadingDataKeys = false;
            }
        );
    }

    render() {
        const { deviceOptions, deviceValue, dataKeyOptions, dataKeyValue, topicOptions, topicValue } = this.state;
        this.loadDevices();

        return (
            <div className="gf-form">
                <HorizontalGroup spacing={'md'} wrap={true}>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label" id="someId">
                            Asset:
                        </div>
                        <Select
                            menuPlacement={'bottom'}
                            autoFocus={true}
                            isLoading={this.loadingDevices}
                            placeholder={'Select a device'}
                            noOptionsMessage={'No devices available'}
                            options={deviceOptions}
                            value={deviceValue}
                            backspaceRemovesValue={true}
                            onChange={this.onDeviceSelectionChange}
                            width={48}
                            onInputChange={this.onDeviceInputChange}
                        />
                    </HorizontalGroup>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label">Topic:</div>
                        <Select
                            menuPlacement={'bottom'}
                            disabled={!this.props.query.deviceId}
                            isLoading={this.loadingTopics}
                            placeholder={'Select a topic'}
                            noOptionsMessage={'No topics available'}
                            options={topicOptions}
                            value={topicValue}
                            backspaceRemovesValue={true}
                            onChange={this.onTopicSelectionChange}
                            width={24}
                        />
                    </HorizontalGroup>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label">Data Key:</div>
                        <Select
                            menuPlacement={'bottom'}
                            disabled={!this.props.query.topic}
                            isLoading={this.loadingDataKeys}
                            placeholder={'Select a data key'}
                            noOptionsMessage={'No data keys available'}
                            options={dataKeyOptions}
                            value={dataKeyValue}
                            backspaceRemovesValue={true}
                            onChange={this.onKeySelectionChange}
                            width={24}
                        />
                    </HorizontalGroup>
                </HorizontalGroup>
            </div>
        );
    }

    onDeviceInputChange = (searchString: string): void => {
        // emit the search string in the search subject
        this.search.next(searchString);
    };

    onDeviceSelectionChange = (event: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
        console.log(event);

        onChange({
            ...query,
            deviceId: event.value,
            device: event.device,
        });

        this.setState((prevState) => ({
            ...prevState,
            deviceValue: event,
        }));

        if (event.value) {
            this.loadTopics(event.value);
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
            this.loadKeys(query.deviceId, event.value);
        }
        // execute the query
        onRunQuery();
    };

    onKeySelectionChange = (event: SelectableValue<string>): void => {
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
            deviceId: '',
            device: undefined,
            topic: '',
            dataKey: '',
        });

        this.setState({
            deviceValue: {},
            deviceOptions: [],
            topicValue: {},
            topicOptions: [],
            dataKeyValue: {},
            dataKeyOptions: [],
        });
    }

    private resetTopicAndDataKeyValues() {
        const { onChange, query } = this.props;
        onChange({
            ...query,
            topic: '',
            dataKey: '',
        });
        this.setState((prevState) => ({
            ...prevState,
            topicValue: {},
            dataKeyValue: {},
            dataKeyOptions: [],
        }));
    }
}
