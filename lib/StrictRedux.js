'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _redux = require('redux');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SliceSeparator = '_';
var QuerySeparator = ',';

/**
 * @class StrictRedux
 * StrictRedux class is a wrapper around vanilla redux store which reduces
 * boilerplate code and enforces some constraints, improving separation of concerns
 * and code maintainability.
 */

var StrictRedux =
/**
 * @param {Object[]} slices - State slice descriptors
 * @param {Function[]?} middlewareFactories - Array of middleware creator. Each
 * middleware creator gets a single argument - reference to a StrictRedux instance.
 */
function StrictRedux(slices) {
  var middlewareFactories = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  _classCallCheck(this, StrictRedux);

  _initialiseProps.call(this);

  Object.assign(this, {
    _selectors: {},
    _reducers: {},
    _actionCreators: {},
    _store: {}
  });
  this._buildStore(slices, middlewareFactories);
}

/**
 * @method
 * @param {string} selectorName - Selector's full name
 * @return {Function} A single selector function
 * @throws An error if there is no selector with such name
 */


/**
 * @method
 * @param {string} queryString - Query, describing needed selectors. A query consists of one or many clauses, separated by commas. All whitespace characters are ignored. Each clause is a full selector name or a state slice name.
 * @return {Object} An object, containing selector functions
 * @throws An error if there is no selectors fitting any of the query clauses
 */


/**
 * @method
 * @param {string} selectorName - Selector's full name
 * @param {Object=} options - Options, passed to selector
 * @param {Object=} state - State object which will be passed to a selector. If omitted, state returned by redux store.getState() method will be returned
 * @return {*} Any value, returned by selector function
 * @throws An error if there is no selector with such name
 */


/**
 * @method
 * @param {string} queryString - Query, describing needed selectors. See [getSelectors]{@link StrictRedux#getSelectors}
 * @param {Object=} options - Options, passed to each selector
 * @param {Object=} state - State object which will be passed to each selector. If omitted, state returned by redux store.getState() method will be returned
 * @return {Object} Object, containing values, returned by each selector function
 * @throws An error if there is no selectors fitting any of the query clauses
 */


/**
 * @method
 * @param {string} actionName - Action's full name
 * @return {Function} A single action creator function
 * @throws An error if there is no action with such name
 */


/**
 * @method
 * @param {string} queryString - Query, describing needed actions. Syntax of the query is the same as for [selectors]{@link StrictRedux#getSelectors}.
 * @return {Object} An object, containing requested action creators
 * @throws An error if there is no actions fitting any of the query clauses
 */


/**
 * Convenience method for usage with react-redux connect() function.
 * @method
 * @param {string} queryString - Query, describing needed selectors. See [getSelectors]{@link StrictRedux#getSelectors}
 * @return {Function} mapStateToProps function, calling [getSelectors()]{@link StrictRedux#getSelectors} under the hood. Own props are used as 'options' param of getSelectors() method
 * @throws An error if there is no selectors fitting any of the query clauses
 */


/**
 * Convenience method for usage with react-redux connect() function.
 * @method
 * @param {string} queryString - Query, describing needed actions. Syntax of the query is the same as for [selectors]{@link StrictRedux#getSelectors}.
 * @return {Function} mapDispatchToProps function, calling [getActions{}]{@link StrictRedux#getActions} under the hood.
 * @throws An error if there is no actions fitting any of the query clauses
 */


/**
 * Convenience method, used to re-dispatch already created actions, caught by middleware
 * @method
 * @param {Object} action - FSA-compliant action.
 * @return {*} - Result of action creator call
 * @throws An error if there is no action of a type
 */


/**
 * @method
 * @return {string[]} Array af all known actions
 */


/**
 * @method
 * @return {Object} Vanilla Redux store
 */
;

var _initialiseProps = function _initialiseProps() {
  var _this = this;

  this.getSelector = function (selectorName) {
    return _this._selectors[selectorName] || throwError('Selector ' + selectorName + ' not found');
  };

  this.getSelectors = function (queryString) {
    return _this._normalizeQuery(queryString, '_selectors').reduce(function (acc, selectorName) {
      var _extends3;

      return _extends({}, acc, (_extends3 = {}, _extends3[selectorName] = _this._selectors[selectorName], _extends3));
    }, {});
  };

  this.selectOne = function (selectorName, options, state) {
    return _this.getSelector(selectorName)(options, state);
  };

  this.select = function (queryString, options, state) {
    var selectors = _this.getSelectors(queryString);

    return Object.keys(selectors).reduce(function (acc, name) {
      var _extends4;

      return _extends({}, acc, (_extends4 = {}, _extends4[name] = selectors[name](options, state), _extends4));
    }, {});
  };

  this.getAction = function (actionName) {
    return _this._actionCreators[actionName] || throwError('Action ' + actionName + ' not found');
  };

  this.getActions = function (queryString) {
    return _this._normalizeQuery(queryString, '_actionCreators').reduce(function (acc, name) {
      var _extends5;

      return _extends({}, acc, (_extends5 = {}, _extends5[name] = _this._actionCreators[name], _extends5));
    }, {});
  };

  this.createMapStateToProps = function (queryString) {
    return function (state, ownProps) {
      return _this.select(queryString, ownProps, state);
    };
  };

  this.createMapDispatchToProps = function (queryString) {
    return function () {
      return _this.getActions(queryString);
    };
  };

  this.strictDispatch = function (action) {
    return _this.getAction(action.type)(action.payload, action.meta);
  };

  this.getActionTypes = function () {
    return Object.keys(_this._actionCreators).reduce(function (acc, name) {
      var _extends6;

      return _extends({}, acc, (_extends6 = {}, _extends6[name] = name, _extends6));
    }, {});
  };

  this.getStore = function () {
    return _this._store;
  };

  this._buildStore = function (slices, middlewareFactories) {
    slices.forEach(function (slice) {
      return _this._registerStateSlice(slice);
    });

    var devTools = process.env.NODE_ENV !== 'production' && window && window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__();

    var middleware = _redux.applyMiddleware.apply(undefined, middlewareFactories.map(function (factory) {
      return factory(_this);
    }));

    // Assign store to pre-created empty object to make it available in middleware factories
    Object.assign(_this._store, (0, _redux.createStore)((0, _redux.combineReducers)(_this._reducers), devTools ? (0, _redux.compose)(middleware, devTools) : middleware));
  };

  this._registerStateSlice = function (sliceDescriptor) {
    var sliceName = sliceDescriptor.sliceName;

    Object.keys(sliceDescriptor.actionReducers).forEach(function (actionName) {
      var fullName = '' + sliceName + SliceSeparator + actionName;

      _this._actionCreators[fullName] = _this._createBoundAction(fullName);
      _this._actionCreators[fullName].type = fullName;
    });

    _this._reducers[sliceName] = _this._createReducer(sliceDescriptor);

    _this._createSelectors(sliceDescriptor);
  };

  this._createBoundAction = function (type) {
    return function (payload, meta) {
      var action = { type: type, payload: payload };

      if (meta) {
        action.meta = meta;
      }

      // Basic support for both vanilla and custom error objects
      if (payload && (payload instanceof Error || Object.getPrototypeOf(payload) instanceof Error)) {
        action.error = true;
      }

      return _this._store.dispatch(action);
    };
  };

  this._createReducer = function (sliceDescriptor) {
    return function () {
      var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : sliceDescriptor.initialState;
      var action = arguments[1];

      if (!Object.keys(_this._actionCreators).includes(action.type) && !action.type.startsWith('@@')) {
        throwError('Unknown action type ' + action.type);
      }

      var sliceActionType = action.type.split(SliceSeparator)[1];

      if (action.type.startsWith(sliceDescriptor.sliceName) && sliceDescriptor.actionReducers[sliceActionType]) {
        return _extends({}, state, sliceDescriptor.actionReducers[sliceActionType](state, action));
      } else {
        return state;
      }
    };
  };

  this._createSelectors = function (sliceDescriptor) {
    var sliceName = sliceDescriptor.sliceName;

    var defaultSelectors = createDefaultSelectors(sliceDescriptor);

    var allSelectors = void 0;
    if (typeof sliceDescriptor.createSliceSelectors === 'function') {
      allSelectors = _extends({}, defaultSelectors, sliceDescriptor.createSliceSelectors(_this.select, _this.selectOne));
    } else {
      allSelectors = defaultSelectors;
    }

    Object.keys(allSelectors).forEach(function (sliceSelectorName) {
      var fullName = '' + sliceName + SliceSeparator + sliceSelectorName;
      _this._selectors[fullName] = function (options, maybeState) {
        var state = maybeState || _this._store.getState();

        // Selector factories get only their own state slice. If something is changed outside of that slice,
        // memoized slice selectors dependant on other slices won't notice that change. To fix this, we create new
        // copy of the state slice any time the whole state is changed.
        var stateSlice = _this._selectors[fullName].prevState === state ? state[sliceName] : _extends({}, state[sliceName]);
        _this._selectors[fullName].prevState = state;

        return allSelectors[sliceSelectorName](stateSlice, options);
      };
    });
  };

  this._normalizeQuery = function (queryString, propertyName) {
    if (typeof queryString !== 'string') {
      throwError('Expecting query of type \'string\'. Got ' + queryString + ' instead');
    }

    return queryString.split(QuerySeparator).reduce(function (acc, queryPart) {
      // Trim query part to support multiline queries and queries with indentation
      var queryClause = queryPart.trim();
      var names = [];

      // For queries, specifying state slice only, return all actions or selectors from the slice
      if (!queryClause.includes(SliceSeparator)) {
        names.push.apply(names, Object.keys(_this[propertyName]).filter(function (fieldName) {
          return fieldName.startsWith(queryClause);
        }));
      } else {
        _this[propertyName][queryClause] && names.push(queryClause);
      }

      if (!names.length) {
        throwError('Bad store query ' + propertyName + ': ' + queryString + '. Could not resolve ' + queryClause);
      }

      return acc.concat(names);
    }, []);
  };
};

function createDefaultSelectors(sliceDescriptor) {
  return Object.keys(sliceDescriptor.initialState).reduce(function (acc, stateProperty) {
    var _extends2;

    return _extends({}, acc, (_extends2 = {}, _extends2[stateProperty] = function (stateSlice) {
      return stateSlice[stateProperty];
    }, _extends2));
  }, {});
}

function throwError(message) {
  throw new Error(message);
}

exports.default = StrictRedux;

/**
 * @namespace sliceDescriptor
 * @property {string} sliceName - Name of a state slice
 * @property {Object} initialState - Initial values of a state slice
 * @property {Object} actionReducers - Reducer functions for each supported action. Keys of this object are used to generate action creators and values are reducer functions
 * @property {Function=} createSliceSelectors - Gets [select]{@link StrictRedux#select} and [selectOne]{@link StrictRedux#selectOne} methods of a StrictRedux instance and returns an object with custom selector functions for this slice. There is no need to create primitive getters manually, as they are generated automatically for each initialState property
 */