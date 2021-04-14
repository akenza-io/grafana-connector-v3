import React, { PureComponent } from 'react';
import { Select } from '@grafana/ui';
import { HorizontalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { Asset } from './types/AkenzaTypes';
import { AkenzaDataSourceConfig, AkenzaQuery } from './types/PluginTypes';
import { QueryEditorState } from './types/Utils';

type Props = QueryEditorProps<DataSource, AkenzaQuery, AkenzaDataSourceConfig>;

export class QueryEditor extends PureComponent<Props, QueryEditorState> {
    private loadingAssets = false;
    private loadingTopics = false;
    private loadingDataKeys = false;
    private initialLoadingComplete = false;
    private dataSourceId: number;

    constructor(props: Props) {
        super(props);
        this.initializeViewProperties();
        this.dataSourceId = this.props.datasource.id;
    }

    private initializeViewProperties() {
        const query = this.props.query;
        // initialize the select values and their options if the panel has been saved before, will initialize empty otherwise
        const assetSelectValue = {
            label: query.asset?.name || undefined,
            value: query.assetId || null,
            asset: query.asset,
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
            assetValue: assetSelectValue,
            assetOptions: [assetSelectValue],
            topicValue: topicSelectValue,
            topicOptions: [topicSelectValue],
            dataKeyValue: dataKeySelectValue,
            dataKeyOptions: [dataKeySelectValue],
        };
        this.loadAssets();
        // load topics and queries if the panel has been saved
        if (query.assetId && query.topic) {
            this.loadTopics(query.assetId);
            this.loadKeys(query.assetId, query.topic);
        }
    }

    private loadAssets(): void {
        // render() is called multiple times, in order to avoid spam calling our API this check has been put into place
        if (!this.loadingAssets && this.dataSourceId !== this.props.datasource.id) {
            this.loadingAssets = true;
            if (this.dataSourceId !== this.props.datasource.id && this.initialLoadingComplete) {
                this.resetAllValues();
                this.dataSourceId = this.props.datasource.id;
            }

            this.props.datasource.getAssets().then(
                (assets: Asset[]) => {
                    const assetSelectOptions: Array<SelectableValue<string>> = [];
                    for (const asset of assets) {
                        assetSelectOptions.push({ label: asset.name, value: asset.id, asset: asset });
                    }
                    this.setState(prevState => ({
                        ...prevState,
                        assetOptions: assetSelectOptions,
                    }));
                    this.loadingAssets = false;
                    this.initialLoadingComplete = true;
                    // initial render does not update the select loading state, hence the force update
                    // it won't trigger a re-rendering of the view, since the above checks prevent this
                    this.forceUpdate();
                },
                // in case an error is thrown, stop the loading animation
                () => {
                    this.loadingAssets = false;
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
                this.setState(prevState => ({
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
                this.setState(prevState => ({
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
        const { assetOptions, assetValue, dataKeyOptions, dataKeyValue, topicOptions, topicValue } = this.state;
        this.loadAssets();

        return (
            <div className="gf-form">
                <HorizontalGroup spacing={'md'} wrap={true}>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label">Asset:</div>
                        <Select
                            menuPlacement={'bottom'}
                            autoFocus={true}
                            isLoading={this.loadingAssets}
                            placeholder={'Select an asset'}
                            noOptionsMessage={'No assets available'}
                            options={assetOptions}
                            value={assetValue}
                            backspaceRemovesValue={true}
                            onChange={this.onAssetSelectionChange}
                            width={48}
                        />
                    </HorizontalGroup>
                    <HorizontalGroup spacing={'none'}>
                        <div className="gf-form-label">Topic:</div>
                        <Select
                            menuPlacement={'bottom'}
                            disabled={!this.props.query.assetId}
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

    onAssetSelectionChange = (event: SelectableValue<string>): void => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({
            ...query,
            assetId: event.value,
            asset: event.asset,
        });
        this.setState(prevState => ({
            ...prevState,
            assetValue: event,
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
        this.setState(prevState => ({
            ...prevState,
            topicValue: event,
        }));
        if (event.value && query.assetId) {
            this.loadKeys(query.assetId, event.value);
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
        this.setState(prevState => ({
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
            assetId: '',
            asset: undefined,
            topic: '',
            dataKey: '',
        });
        this.setState({
            assetValue: {},
            assetOptions: [],
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
        this.setState(prevState => ({
            ...prevState,
            topicValue: {},
            dataKeyValue: {},
            dataKeyOptions: [],
        }));
    }
}
