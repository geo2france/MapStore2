/*
 * Copyright 2025, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import tags from '../tags';
import expect from 'expect';
import {
    showTagsPanel
} from '../../actions/tags';

describe('tags reducer', () => {
    it('showTagsPanel', () => {
        expect(tags({}, showTagsPanel(true))).toEqual({ show: true });
    });
});
