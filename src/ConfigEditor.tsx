import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { AkenzaDataSourceConfig, AkenzaSecureDataSourceConfig } from './types/PluginTypes';

const {FormField} = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<AkenzaDataSourceConfig, AkenzaSecureDataSourceConfig> {
}

interface State {
}

export class ConfigEditor extends PureComponent<Props, State> {

    onBaseUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        const jsonData = {
            ...options.jsonData,
            baseUrl: event.target.value,
        };
        onOptionsChange({...options, jsonData});
    };

    // secure field (only sent to the backend)
    onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        if (options.jsonData.apiKey) {
            // special backwards compatibility thing...
            // the old api key was stored unencrypted, meaning it'll be set to empty string and from now on only the encrypted property will be used...
            console.info('the api key was stored unencrypted... clearing it from the unencrypted store and storing it encrypted...');
            // not sure if this is the correct way to do these things but calling onOptionsChange(...) twice in a row in short succession leads to some janky behaviour...
            options.jsonData.apiKey = null;
        }
        // store the api key encrypted
        const secureJsonData = {
            ...options.secureJsonData,
            apiKey: event.target.value,
        };
        onOptionsChange({...options, secureJsonData});
    };

    render() {
        const {options} = this.props;
        const {jsonData, secureJsonData, secureJsonFields} = options;

        return (
            <div className="gf-form-group">
                <div className="gf-form">
                    <FormField
                        label="Base URL"
                        labelWidth={10}
                        inputWidth={27}
                        onChange={this.onBaseUrlChange}
                        value={jsonData.baseUrl || ''}
                        placeholder="e.g. https://api.akenza.io"
                    />
                </div>
                <div className="gf-form">
                    <FormField
                        type="password"
                        value={secureJsonData?.apiKey || ''}
                        placeholder={(secureJsonFields?.apiKey || jsonData.apiKey) ? 'API Key configured' : 'API-Key'}
                        label="API Key"
                        labelWidth={10}
                        inputWidth={27}
                        onChange={this.onAPIKeyChange}
                    />
                </div>
            </div>
        );
    }
}
