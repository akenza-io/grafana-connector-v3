import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { AkenzaDataSourceConfig } from './types/PluginTypes';

const { FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<AkenzaDataSourceConfig> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
    onBaseUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { onOptionsChange, options } = this.props;
        const jsonData = {
            ...options.jsonData,
            baseUrl: event.target.value,
        };
        onOptionsChange({ ...options, jsonData });
    };

    // Secure field (only sent to the backend)
    onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { onOptionsChange, options } = this.props;
        const jsonData = {
            ...options.jsonData,
            apiKey: event.target.value,
        };
        onOptionsChange({ ...options, jsonData });
    };

    render() {
        const { options } = this.props;
        const { jsonData } = options;

        return (
            <div className="gf-form-group">
                <div className="gf-form">
                    <FormField
                        label="Base URL"
                        labelWidth={10}
                        inputWidth={27}
                        onChange={this.onBaseUrlChange}
                        value={jsonData.baseUrl || ''}
                        placeholder="e.g. https://api.core.akenza.io"
                    />
                </div>
                <div className="gf-form">
                    <FormField
                        value={jsonData.apiKey || ''}
                        label="API Key"
                        placeholder="API Key"
                        labelWidth={10}
                        inputWidth={27}
                        onChange={this.onAPIKeyChange}
                    />
                </div>
            </div>
        );
    }
}
