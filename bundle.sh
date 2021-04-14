#!/bin/bash
set -e

rm -rf tmp/

npm install
npm run build

mkdir -p tmp/akenza-grafana-connector
cp -R dist/ tmp/akenza-grafana-connector/
cd tmp && zip -r akenza-grafana-connector.zip akenza-grafana-connector
/bin/cp -rf akenza-grafana-connector.zip "/Volumes/GoogleDrive/Shared drives/Core/akenza-grafana-connector.zip"