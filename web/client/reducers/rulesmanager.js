/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';

import wk from 'wellknown';
import { isEmpty, head, uniq, concat } from 'lodash';

import {
    RULES_SELECTED,
    OPTIONS_LOADED,
    UPDATE_FILTERS_VALUES,
    LOADING,
    EDIT_RULE,
    SET_FILTER,
    CLEAN_EDITING,
    RULE_SAVED,
    // for gs instances
    CLEAN_EDITING_GS_INSTANCE,
    SWITCH_GRID,
    GS_INSTANCES_SELECTED,
    EDIT_GS_INSTSANCES,
    GS_INSTSANCE_SAVED,
    STORING_GS_INSTANCES_DD
} from '../actions/rulesmanager';

import { CHANGE_DRAWING_STATUS } from '../actions/draw';
const defaultState = {
    services: {
        WFS: [
            "DescribeFeatureType",
            "GetCapabilities",
            "GetFeature",
            "GetFeatureWithLock",
            "LockFeature",
            "Transaction"
        ],
        WMS: [
            "DescribeLayer",
            "GetCapabilities",
            "GetFeatureInfo",
            "GetLegendGraphic",
            "GetMap",
            "GetStyles"
        ]
    },
    triggerLoad: 0,
    grantDefault: "ALLOW",
    activeGrid: "rules",
    filters: {}
};

const getPosition = ({targetPosition = {}}, priority) => {
    switch (priority) {
    case -1:
        return targetPosition.offsetFromTop;
    case +1:
        return targetPosition.offsetFromTop + 1;
    default:
        return 0;
    }
};
// GEOFENCE ACCEPTS ONLY MULTYPOLYGON
const fixGeometry = (g, method = "") => {
    if (method === "" || isEmpty(g) || !g.coordinates || g.coordinates.length === 0) {
        return g;
    }
    const c = g.coordinates[0];
    if (method === "Polygon") {
        return {...g, type: "MultiPolygon", coordinates: [[[...c, c[0]]]]};
    }
    return {...g, type: "MultiPolygon", coordinates: [[c]]};
};

function rulesmanager(state = defaultState, action) {
    switch (action.type) {
    case RULES_SELECTED: {
        if (!action.merge) {
            return assign({}, state, {
                selectedRules: action.rules,
                targetPosition: action.targetPosition
            });
        }
        const newRules = action.rules || [];
        const existingRules = state.selectedRules || [];
        if (action.unselect) {
            return assign({}, state, {
                selectedRules: existingRules.filter(
                    rule => !head(newRules.filter(unselected => unselected.id === rule.id)))
            });
        }
        return assign({}, state, { selectedRules: uniq(concat(existingRules, newRules), rule => rule.id)});
    }
    case UPDATE_FILTERS_VALUES: {
        const filtersValues = state.filtersValues || {};
        return assign({}, state, {
            filtersValues: assign({}, filtersValues, action.filtersValues)
        });
    }
    case OPTIONS_LOADED: {
        return assign({}, state, {
            options: assign({}, state.options, {
                [action.name]: action.values || [],
                [action.name + "Page"]: action.page,
                [action.name + "Count"]: action.valuesCount
            })
        });
    }
    case LOADING:
        return assign({}, state, {loading: action.loading});
    case SET_FILTER: {
        const {key, value, isResetField} = action;
        if (isResetField) {
            if (key === "rolename") {
                return assign({}, state, {filters: {...(state.filters || {}), [key]: value, ['roleAny']: undefined}});
            } else if (key === "username") {
                return assign({}, state, {filters: {...(state.filters || {}), [key]: value, ['userAny']: undefined}});
            }
            return assign({}, state, {filters: {...(state.filters || {}), [key]: value, [key + 'Any']: undefined}});
        }
        if (value || key?.includes('Any')) {
            return assign({}, state, {filters: {...(state.filters || {}), [key]: value}});
        }
        const {[key]: omit, ...newFilters} = state.filters || {};
        return assign({}, state, {filters: newFilters});
    }
    case EDIT_RULE: {
        const {createNew, targetPriority} = action;
        if (createNew) {
            return assign({}, state, {activeRule: {grant: state.grantDefault, position: {value: getPosition(state, targetPriority), position: "offsetFromTop"}}});
        }
        const activeRule = state.selectedRules[0] || {};
        const geometryState = activeRule.constraints && activeRule.constraints.restrictedAreaWkt && {
            wkt: activeRule.constraints.restrictedAreaWkt,
            geometry: wk.parse(activeRule.constraints.restrictedAreaWkt)} || {};
        return assign({}, state, {activeRule,
            position: {value: state.targetPosition.offsetFromTop, position: "offsetFromTop"},
            geometryState});
    }
    case RULE_SAVED: {
        return assign({}, state, {triggerLoad: (state.triggerLoad || 0) + 1, geometryState: undefined, activeRule: undefined, selectedRules: [], targetPosition: undefined });
    }
    case CLEAN_EDITING: {
        return assign({}, state, {activeRule: undefined, geometryState: undefined});
    }
    case CHANGE_DRAWING_STATUS: {
        let newState;
        if (action.owner === "rulesmanager" && (action.status === "stop" || action.status === "start" || action.status === "clean")) {
            const geometry = fixGeometry(((action.features || [])[0] || {}), action.method);
            newState = assign({}, state, {geometryState: assign({}, {
                geometry,
                wkt: !isEmpty(geometry) && wk.stringify(geometry) || undefined
            })});
        } else {
            newState = state;
        }

        return newState;
    }
    case SWITCH_GRID: {
        if (action.activeGrid === state.activeGrid) return state;
        return assign({}, state, {
            activeGrid: action.activeGrid,
            activeGSInstance: undefined,
            activeRule: undefined,
            selectedGSInstances: [],
            selectedRules: [],
            filters: {},
            instances: []
        });
    }
    // for gs instances
    case EDIT_GS_INSTSANCES: {
        const {createNew} = action;
        if (createNew) {
            return assign({}, state, {activeGSInstance: {}});
        }
        const activeGSInstance = state.selectedGSInstances[0] || {};

        return assign({}, state, {activeGSInstance});
    }
    case GS_INSTSANCE_SAVED: {
        return assign({}, state, {triggerLoad: (state.triggerLoad || 0) + 1, geometryState: undefined, activeGSInstance: undefined, selectedGSInstances: [], instances: [] });
    }
    case GS_INSTANCES_SELECTED: {
        if (!action.merge) {
            return assign({}, state, {
                selectedGSInstances: action.gsInstances
            });
        }
        const newGSInstances = action.gsInstances || [];
        const existingGSInstances = state.selectedGSInstances || [];
        if (action.unselect) {
            return assign({}, state, {
                selectedGSInstances: existingGSInstances.filter(
                    gsInstance => !head(newGSInstances.filter(unselected => unselected.id === gsInstance.id)))
            });
        }
        return assign({}, state, { selectedGSInstances: uniq(concat(existingGSInstances, newGSInstances), gsInstance => gsInstance.id)});
    }
    case CLEAN_EDITING_GS_INSTANCE: {
        return assign({}, state, {activeGSInstance: undefined, geometryState: undefined});
    }
    case STORING_GS_INSTANCES_DD: {
        return assign({}, state, { instances: action.instances });
    }
    default:
        return state;
    }
}

export default rulesmanager;
