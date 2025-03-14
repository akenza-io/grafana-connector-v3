# Akenza Grafana Connector

Development tips, hints and other useful things.

## Coding guidelines

adhere to the default TypeScript coding guidelines and lint on a regular basis.

## Getting started

1. Install the dependencies

```BASH
yarn install
```

2. Run in `watch mode`

```BASH
yarn watch
```

3. Start the docker-compose Grafana instance

```BASH
docker-compose up grafana
```

The Grafana server will be started and can be accessed at [localhost:3000]() using the default login credentials (admin: admin)

## Signing the plugin

Refer to [this guide](https://grafana.com/docs/grafana/latest/developers/plugins/sign-a-plugin/) on how to sign a plugin.

TL;DR:

`export GRAFANA_API_KEY=<grafana-api-key>` create an API Key with the `PluginPublisher` role in the Grafana account then

execute `npx @grafana/toolkit plugin:sign --rootUrls https://grafana.akenza.io,https://grafana.anotherdomain.com` to sign the plugin

## Data Source Plugin Development Resources

- [Build a data source plugin tutorial](https://grafana.com/tutorials/build-a-data-source-plugin)
- [Grafana documentation](https://grafana.com/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/) - Grafana Tutorials are step-by-step guides that help you make the most of Grafana
- [Grafana UI Library](https://developers.grafana.com/ui) - UI components to help you build interfaces using Grafana Design System

## Install the Plugin in the local installation

useful for verifying the signature and testing the packaged plugin

```BASH
docker run -d \
-p 3000:3000 \
--name=grafana \
-e 'GF_INSTALL_PLUGINS=https://github.com/akenza-io/grafana-connector-v3/releases/download/v{VERSION}/akenza-datasource-{VERSION}.zip;akenza-datasource' \
grafana/grafana:7.5.4
```

## Releasing

```
export VERSION=v1.0.8
git tag $VERSION
git push origin --tags
```
