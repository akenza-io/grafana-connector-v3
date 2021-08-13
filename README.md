# Akenza Grafana Connector

This plugin enables the use of Akenza Device Data to be visualized in Grafana.

## What is Grafana Data Source Plugin?

Grafana supports a wide range of data sources, including Prometheus, MySQL, and even Datadog. There’s a good chance you can already visualize metrics from the systems you have set up. In some cases, though, you already have an in-house metrics solution that you’d like to add to your Grafana dashboards. Grafana Data Source Plugins enables integrating such solutions with Grafana.

## Getting started

1. Install dependencies
```BASH
yarn install
```
2. Run in watch mode
```BASH
yarn watch
```
3. Start the docker-compose Grafana instance
```BASH
docker-compose up grafana
```
The Grafana server will be started and can be accessed at [localhost:3000](). The Plugin is located at the very bottom of the Plugin list.

## Signing the plugin

[how to sign a plugin](https://grafana.com/docs/grafana/latest/developers/plugins/sign-a-plugin/)

TL;DR:

```export GRAFANA_API_KEY=<grafana-api-key>``` create an API Key with PluginPublisher role of the Grafana account 

```npx @grafana/toolkit plugin:sign --rootUrls https://akenza.io``` use to sign the plugin

## Data Source Plugin Development Resources
- [Build a data source plugin tutorial](https://grafana.com/tutorials/build-a-data-source-plugin)
- [Grafana documentation](https://grafana.com/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/) - Grafana Tutorials are step-by-step guides that help you make the most of Grafana
- [Grafana UI Library](https://developers.grafana.com/ui) - UI components to help you build interfaces using Grafana Design System

## Install the Plugin locally

```
docker run -d \
-p 3000:3000 \
--name=grafana \
-e 'GF_INSTALL_PLUGINS=https://github.com/akenza-io/grafana-connector-v3/releases/download/v{VERSION}/akenza-datasource-{VERSION}.zip;akenza-datasource' \
grafana/grafana:7.5.4
```
