import { applyMiddleware, compose, createStore, combineReducers } from 'redux'

const SliceSeparator = '_'
const QuerySeparator = ','

/**
 * @class
 * StrictRedux class is a wrapper around vanilla redux store which reduces
 * boilerplate code and enforces some constraints, improving separation of concerns
 * and code maintainability.
 */
class StrictRedux {
  /**
   * @param {Object[]} slices - State slice descriptors
   * @param {Function[]?} middlewareFactories - Array of middleware creators. Each
   * middleware creator gets a single argument - reference to a StrictRedux instance.
   */
  constructor (slices, middlewareFactories = []) {
    Object.assign(this, {
      _selectors: {},
      _reducers: {},
      _actionCreators: {},
      _store: {}
    })
    this._buildStore(slices, middlewareFactories)
  }

  /**
   * @method
   * @param {string} selectorName - Selector's full name
   * @return {Function} A single selector function
   * @throws An error if there is no selector with such name
   */
  getSelector = (selectorName) => this._selectors[selectorName] || throwError(`Selector ${selectorName} not found`)

  /**
   * @method
   * @param {string} queryString - Query, describing needed selectors. A query consists of one or many clauses, separated by commas. All whitespace characters are ignored. Each clause is a full selector name or a state slice name.
   * @return {Object} An object, containing selector functions
   * @throws An error if there is no selectors fitting any of the query clauses
   */
  getSelectors = (queryString) => this._normalizeQuery(queryString, '_selectors').reduce((acc, selectorName) => ({
    ...acc,
    [selectorName]: this._selectors[selectorName]
  }), {})

  /**
   * @method
   * @param {string} selectorName - Selector's full name
   * @param {Object=} options - Options, passed to selector
   * @param {Object=} state - State object which will be passed to a selector. If omitted, state returned by redux store.getState() method will be used
   * @return {*} Any value, returned by the selector function
   * @throws An error if there is no selector with such name
   */
  selectOne = (selectorName, options, state) => this.getSelector(selectorName)(options, state)

  /**
   * @method
   * @param {string} queryString - Query, describing needed selectors. See [getSelectors]{@link StrictRedux#getSelectors}
   * @param {Object=} options - Options, passed to each selector
   * @param {Object=} state - State object which will be passed to each selector. If omitted, state returned by redux store.getState() method will be used
   * @return {Object} Object, containing values, returned by each selector function
   * @throws An error if there is no selectors fitting any of the query clauses
   */
  select = (queryString, options, state) => {
    const selectors = this.getSelectors(queryString)

    return Object.keys(selectors).reduce((acc, name) => ({
      ...acc,
      [name]: selectors[name](options, state)
    }), {})
  }

  /**
   * @method
   * @param {string} actionName - Action's full name
   * @return {Function} A single action creator function
   * @throws An error if there is no action with such name
   */
  getAction = (actionName) => this._actionCreators[actionName] || throwError(`Action ${actionName} not found`)

  /**
   * @method
   * @param {string} queryString - Query, describing needed actions. Syntax of the query is the same as for [selectors]{@link StrictRedux#getSelectors}.
   * @return {Object} An object, containing requested action creators
   * @throws An error if there is no actions fitting any of the query clauses
   */
  getActions = (queryString) => this._normalizeQuery(queryString, '_actionCreators')
    .reduce((acc, name) => ({ ...acc, [name]: this._actionCreators[name] }), {})

  /**
   * Convenience method for usage with react-redux connect() function.
   * @method
   * @param {string} queryString - Query, describing needed selectors. See [getSelectors]{@link StrictRedux#getSelectors}
   * @return {Function} mapStateToProps function, calling [getSelectors()]{@link StrictRedux#getSelectors} under the hood. Own props are used as 'options' param of getSelectors() method
   * @throws An error if there is no selectors fitting any of the query clauses
   */
  createMapStateToProps = queryString => (state, ownProps) => this.select(queryString, ownProps, state)

  /**
   * Convenience method for usage with react-redux connect() function.
   * @method
   * @param {string} queryString - Query, describing needed actions. Syntax of the query is the same as for [selectors]{@link StrictRedux#getSelectors}.
   * @return {Function} mapDispatchToProps function, calling [getActions{}]{@link StrictRedux#getActions} under the hood.
   * @throws An error if there is no actions fitting any of the query clauses
   */
  createMapDispatchToProps = queryString => () => this.getActions(queryString)

  /**
   * Convenience method, used to re-dispatch already created actions caught by middleware
   * @method
   * @param {Object} action - FSA-compliant action.
   * @return {*} - Result of action creator call
   * @throws An error if there is no action of a type
   */
  strictDispatch = (action) => this.getAction(action.type)(action.payload, action.meta)

  /**
   * @method
   * @param {string=} queryString - Query, describing actions. If omitted, all action types will be returned
   * @return {Object} List all known actions that match the query
   */
  getActionTypes = (queryString) => {
    if (queryString) {
      return this._normalizeQuery(queryString, '_actionCreators').reduce((acc, name) => ({ ...acc, [name]: name }), {})
    }
    return Object.keys(this._actionCreators).reduce((acc, name) => ({...acc, [name]: name}), {})
  }

  /**
   * @method
   * @return {Object} Vanilla Redux store
   */
  getStore = () => this._store


  _buildStore = (slices, middlewareFactories) => {
    slices.forEach(slice => this._registerStateSlice(slice))

    const devTools = process.env.NODE_ENV !== 'production' &&
      window &&
      window.__REDUX_DEVTOOLS_EXTENSION__ &&
      window.__REDUX_DEVTOOLS_EXTENSION__()

    const middleware = applyMiddleware(...middlewareFactories.map(factory => factory(this)))

    // Assign store to pre-created empty object to make it available in middleware factories
    Object.assign(this._store, createStore(
      combineReducers(this._reducers),
      devTools ? compose(
        middleware,
        devTools
      ) : middleware
    ))
  }

  _registerStateSlice = (sliceDescriptor) => {
    const sliceName = sliceDescriptor.sliceName

    Object.keys(sliceDescriptor.actionReducers).forEach(actionName => {
      const fullName = `${sliceName}${SliceSeparator}${actionName}`

      this._actionCreators[fullName] = this._createBoundAction(fullName)
      this._actionCreators[fullName].type = fullName
    })

    this._reducers[sliceName] = this._createReducer(sliceDescriptor)

    this._createSelectors(sliceDescriptor)
  }

  _createBoundAction = (type) => (payload, meta) => {
    const action = { type, payload }

    if (meta) {
      action.meta = meta
    }

    // Basic support for both vanilla and custom error objects
    if (payload && (payload instanceof Error || Object.getPrototypeOf(payload) instanceof Error)) {
      action.error = true
    }

    return this._store.dispatch(action)
  }

  _createReducer = (sliceDescriptor) => (state = sliceDescriptor.initialState, action) => {
    if (!Object.keys(this._actionCreators).includes(action.type) && !action.type.startsWith('@@')) {
      throwError(`Unknown action type ${action.type}`)
    }

    const sliceActionType = action.type.split(SliceSeparator)[1]

    if (action.type.startsWith(sliceDescriptor.sliceName) && sliceDescriptor.actionReducers[sliceActionType]) {
      return { ...state, ...sliceDescriptor.actionReducers[sliceActionType](state, action.payload) }
    } else {
      return state
    }
  }

  _createSelectors = (sliceDescriptor) => {
    const sliceName = sliceDescriptor.sliceName

    const defaultSelectors = createDefaultSelectors(sliceDescriptor)

    let allSelectors
    if (typeof sliceDescriptor.createSelectors === 'function') {
      allSelectors = { ...defaultSelectors, ...sliceDescriptor.createSelectors(this.select, this.selectOne) }
    } else {
      allSelectors = defaultSelectors
    }

    Object.keys(allSelectors).forEach(sliceSelectorName => {
      const fullName = `${sliceName}${SliceSeparator}${sliceSelectorName}`
      this._selectors[fullName] = (options, maybeState) => {
        const state = maybeState || this._store.getState()

        // Selector factories get only their own state slice. If something is changed outside of that slice,
        // memoized slice selectors dependant on other slices won't notice that change. To fix this, we create new
        // copy of the state slice any time the whole state is changed.
        const stateSlice = (this._selectors[fullName].prevState === state) ? state[sliceName] : { ...state[sliceName] }
        this._selectors[fullName].prevState = state

        return allSelectors[sliceSelectorName](stateSlice, options)
      }
    })
  }

  _normalizeQuery = (queryString, propertyName) => {
    if (typeof queryString !== 'string') {
      throwError(`Expecting query of type 'string'. Got ${queryString} instead`)
    }

    return queryString.split(QuerySeparator).reduce((acc, queryPart) => {
      // Trim query part to support multiline queries and queries with indentation
      const queryClause = queryPart.trim()
      const names = []

      // For queries, specifying state slice only, return all actions or selectors from the slice
      if (!queryClause.includes(SliceSeparator)) {
        names.push(...Object.keys(this[propertyName])
          .filter(fieldName => fieldName.startsWith(queryClause))
        )
      } else {
        this[propertyName][queryClause] && names.push(queryClause)
      }

      if (!names.length) {
        throwError(`Bad store query ${propertyName}: ${queryString}. Could not resolve ${queryClause}`)
      }

      return acc.concat(names)
    }, [])
  }
}


function createDefaultSelectors (sliceDescriptor) {
  return Object.keys(sliceDescriptor.initialState).reduce((acc, stateProperty) => ({
    ...acc,
    [stateProperty]: stateSlice => stateSlice[stateProperty]
  }), {})
}

function throwError (message) {
  throw new Error(message)
}


export default StrictRedux


/**
 * @namespace sliceDescriptor
 * @property {string} sliceName - Name of a state slice
 * @property {Object} initialState - Initial values of a state slice
 * @property {Object} actionReducers - Reducer functions for each supported action. Keys of this object are used to generate action creators, values are reducer functions
 * @property {Function=} createSelectors - Gets [select]{@link StrictRedux#select} and [selectOne]{@link StrictRedux#selectOne} methods of a StrictRedux instance and returns an object with custom selector functions for this slice. There is no need to create primitive getters manually, as they are generated automatically for each initialState property
 */
