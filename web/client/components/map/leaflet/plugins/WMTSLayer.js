/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Layers from '../../../../utils/leaflet/Layers';
import {normalizeSRS} from '../../../../utils/CoordinatesUtils';
import L from 'leaflet';
import {addAuthenticationParameter} from '../../../../utils/SecurityUtils';
import { creditsToAttribution } from '../../../../utils/LayersUtils';
import * as WMTSUtils from '../../../../utils/WMTSUtils';
import WMTS from '../../../../utils/leaflet/WMTS';
import { isArray } from 'lodash';
import { isVectorFormat } from '../../../../utils/VectorTileUtils';

L.tileLayer.wmts = function(urls, options, matrixOptions) {
    return new WMTS(urls, options, matrixOptions);
};

function wmtsToLeafletOptions(options) {
    const srs = normalizeSRS(options.srs || 'EPSG:3857', options.allowedSRS);
    const attribution = options.credits && creditsToAttribution(options.credits) || '';
    const tileMatrixSet = WMTSUtils.getTileMatrixSet(options.tileMatrixSet, srs, options.allowedSRS, options.matrixIds);
    return Object.assign({
        requestEncoding: options.requestEncoding,
        layer: options.name,
        style: options.style || "",
        attribution,
        // set image format to png if vector to avoid errors while switching between map type
        format: isVectorFormat(options.format) && 'image/png' || options.format || 'image/png',
        tileMatrixSet: tileMatrixSet,
        version: options.version || "1.0.0",
        tileSize: options.tileSize || 256,
        CRS: normalizeSRS(options.srs || 'EPSG:3857', options.allowedSRS),
        maxZoom: options.maxZoom || 23,
        maxNativeZoom: options.maxNativeZoom || 18
    }, options.params || {});
}

function getWMSURLs(urls) {
    return urls.map((url) => url.split("\?")[0]);
}

const createLayer = _options => {
    const options = WMTSUtils.parseTileMatrixSetOption(_options);
    const urls = getWMSURLs(isArray(options.url) ? options.url : [options.url]);
    const queryParameters = wmtsToLeafletOptions(options) || {};
    urls.forEach(url => addAuthenticationParameter(url, queryParameters, options.securityToken));
    const srs = normalizeSRS(options.srs || 'EPSG:3857', options.allowedSRS);
    const { tileMatrixSet, matrixIds } = WMTSUtils.getTileMatrix(options, srs);
    return L.tileLayer.wmts(urls, queryParameters, {
        tileMatrixPrefix: options.tileMatrixPrefix || queryParameters.tileMatrixSet + ':' || srs + ':',
        originY: options.originY || 20037508.3428,
        originX: options.originX || -20037508.3428,
        ignoreErrors: options.ignoreErrors || false,
        // TODO: use matrix IDs sorted from getTileMatrix
        matrixIds: matrixIds,
        matrixSet: tileMatrixSet
    });
};

const updateLayer = (layer, newOptions, oldOptions) => {
    if (oldOptions.securityToken !== newOptions.securityToken
    || oldOptions.format !== newOptions.format
    || oldOptions.credits !== newOptions.credits) {
        return createLayer(newOptions);
    }
    return null;
};

Layers.registerType('wmts', {create: createLayer, update: updateLayer});
