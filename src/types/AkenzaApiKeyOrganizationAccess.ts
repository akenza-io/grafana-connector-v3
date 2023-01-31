import buildUrl from 'build-url';
import { Observable } from 'rxjs';
import { DataSource } from '../DataSource';
import { AccessCheckResponse, AkenzaApiAccess, DeviceList, Organization, OrganizationList } from './AkenzaTypes';
import { BackendSrvRequest, FetchError, FetchResponse, getBackendSrv } from '@grafana/runtime';

/**
 * singleton promise class used to synchronize the loading of available workspaces for api keys
 */
export class AkenzaApiKeyOrganizationAccess {
    private instance: Promise<AkenzaApiAccess> | null;
    private readonly url: string;

    constructor(url: string) {
        this.url = url;
        this.instance = null;
    }

    // singleton implementation for a promise
    async getInstance(): Promise<AkenzaApiAccess> {
        if (!this.instance) {
            this.instance = this.initializeInstancePromise();
        }

        return this.instance;
    }

    private async initializeInstancePromise(): Promise<AkenzaApiAccess> {
        return new Promise((resolve) => {
            this.getOrganization()
                .then(organization => {
                    this.getWorkspaceAccess(organization.id).then(access => {
                        resolve({
                            organizationId: organization.id,
                            all: access.all,
                            workspaceIds: access.ids,
                        })
                    })
                });
        })
    }

    // get the organization details
    private async getOrganization(): Promise<Organization> {
        const params = {
            size: 1,
            minimal: true,
        };

        return new Promise((resolve, reject) => {
            this.executeRequest<DeviceList>(
                '/v3/organizations',
                'GET',
                params)
                .subscribe({
                    next(response: FetchResponse<OrganizationList>) {
                        resolve(response.data.content[0]);
                    },
                    error(error: FetchError) {
                        reject(DataSource.generateErrorMessage(error))
                    }
                });
        });
    }

    // get the accessible workspaces for the api key
    private async getWorkspaceAccess(organizationId: string): Promise<AccessCheckResponse> {
        const params = {
            organizationId: organizationId,
            scope: 'ASSET',
            verb: 'READ'
        };

        return new Promise((resolve, reject) => {
            this.executeRequest<AccessCheckResponse>(
                '/v3/workspace-access',
                'GET',
                params)
                .subscribe({
                    next(response: FetchResponse<AccessCheckResponse>) {
                        resolve(response.data)
                    },
                    error(error: FetchError) {
                        reject(DataSource.generateErrorMessage(error))
                    }
                });
        });
    }

    private executeRequest<T>(path: string, method: string, params?: any, data?: any): Observable<FetchResponse<T>> {
        const options: BackendSrvRequest = {
            url: buildUrl(this.url, {path}),
            method,
            params,
            data,
        };

        return getBackendSrv().fetch(options);
    }
}
