## Motivation
Vanilla Redux requires to much boilerplate and does not enforce enough constraints on how to structure state data and state management code. Strict-redux uses more opinionated approach, allowing to write more succinct and maintainable code.

## Main Concepts
Strict-redux enforces breaking state management code into slices, which are as isolated one from another, as possible. While in vanilla Redux you can mutate state only via actions, but not directly, in strict-redux you also cannot read the state directly, but only via selectors. State slices cross-talk is also constarined - there is no way to update different state slices in one reducer function, and selectors may read another state slice only via that slice's selectors. 

Each slice is described with a slice descriptor object, containing four properties - `sliceName`, `initialState`, `actionReducers` and optional `createSelectors` factory function. Slice name and initial state are self-evident. Action reducer is an object, each key of which is an action name and value is a reducer function. As each reducer function works with single action type, it receives action payload instead of the whole action. State changes are merged into state automatically, so you don't need to repeat `Object.assign()` `{...stateSlice, /* new state */}` in each reducer function. Selectors factory is a function which receives two strict-redux public methods for accessing other slices state and returns an object with custom selectors. 

Other parts of your application access state and actions via queries. Each query is a string, consisting of one or many clauses, separated by commas. Each clause is either a full selector or action name, or a slice name. In the latter case, query result is an object, containing all selectors or actions in the slice.

Strict-redux encourages organising domain logic code in form of middleware that passively listens for actions and\or state changes. Redux-saga is a recommended way to manage domain logic and side effects. StrictRedux constructor accepts middleware in form of middleware factory functions. Middleware factory gets a strict-redux instance as a single argument, so that it would be aware of state structire and action types. If you don't need it, just return you middleware from factory function as is.

## How strict-redux reduces boilerplate
Strict-redux uses information from slice descriptors to eliminate boilerplate code. 

Slice name in combination with action reducers is used to generate action types. For instance, if the slice name is `auth` and there are action reducers `login`, `loginSuccess`, `loginError`, and `logout`, following action types will be registered: `auth_login`, `auth_loginSuccess`, `auth_loginError`, `auth_logout`. 

Selector names are inferred from slice name, initial state, and an object, returned from selectors factory. For each initial state property basic selector is generated, so you don't need to write code like this:
```
isLoading = stateSlice => stateSlice.isLoading,
isDeleting = stateSlice => stateSlice.isDeleting,
isUpdating = stateSlice => stateSlice.isUpdating,
...
```
You only have to write selectors that somehow transform state, combine information from different slices and/or memoize it. If in our `auth` state slice initial state has the following shape:
```
{
  isLoggingIn: false,
  user: undefined,
  error: undefined
}
```
`auth_isLoggingIn`, `auth_user`, and `auth_error` selectors will be created automatically. Let's suppose you decide it would be conveniet to have another selector `auth_isLoggedIn`, which returns true if `user` property is not empty. You have to write the following selector factory:
```
export function createSelectors (select, selectOne) {
  return {
    isLoggedIn: stateSlice => !!stateSlice.user
  }
}
```

## Dispatching actions
When UI component or domain logic code needs to dispatch actions, it gets them via `getAction()` and `getActions()` methods. `getActions()` accepts query string and returns an object containing all requested action creators. All action creators ar bound to the store instance, so you do not need to call `dispatch()`. In fact, you don't even have access to vanilla Redux `store.dispatch()` method (there is an escape hatch though in form of `getStore()` method, which returns the original Redux store). 

Let's assume you are building a classical todo list application. You may need all (or at least many) of todo-related actions and a single logout action in some UI component or function, implementing API calls. You may get them as follows: 
```
const {
  todos_fetch
  todos_create,
  todos_update,
  todos_markAsDone,
  auth_logout
} = getActions('todos, auth_logout`)
```
If you need just one action, `getAction()` method returns it directly, reducing verbosity of your code, e.g. `getAction('auth_login')(credentials)` instead of `getActions('auth_login').auth_login(credentials)` 

For usage with react-redux there is a convenience method `createMapDispatchToProps()` which accepts the same query string, but returns function, suited to be consumed by `connect()`

There is also `strictDispatch()` method, which may be useful in scenarios, when you intercept actions in a middleware for batching or debouncing purposes and then re-dispatch them. `strictDispatch()` accepts FSA-compliant action and cheks its type against known action types before re-dispatching. 

## Accessing state
You cannot access state directly. As with `dispatch()`, the only way to get original state is via 'escape hatch' call to `getStore().getState()`, which is not recommended. Instead you query selectors the same way you did with actions. The only difference is that besides `getSelectors()`, `getSelector()` and `createMapsStateToProps()`, you have `select()` and `selectOne()` methods, returning not selector functions, but their result. 

`getSelector()` and `getSelectors()` methods accept one argument - query string - and return a single selector or selectors object. Selectors themselves accept two optional arguments - `options` and `state` objects. `select()` and `selectOne()` retrieve selectors and engage them in a single call, so they accept three arguments - query string, options and state. 

Typical example of `options` is `ownProps` object, used by react-redux's `connect()` function. `state` is almost always used only intrernally in `createMapStateToProps()` method, because `connect()` passes current state to `mapStateToProps()` by itself. In most cases you will call `select()` with just on argument - query string. Current state is attached automatically by calling `getState()` right before the moment of selector call. 

## Memoized selectors
Strict-redux supports usage of memoized selectors, created by reselect library. As each selector defined in the `createSelectors` factory gets only its own state slice, but not the whole state, it have to call selectors from other state slices. But memoized selector, created by reselect's `createSelector()` would not even be called, if it gets the same argumnents as in previous call. If our selector depends on other state slices, it would not notice changes in that slices, and would return incorrect value. To alleviate this, strict-redux saves a reference to previous whole state for each slice selector and passes a brand-new shallow copy of a state slice into selector each time the whole state changed anywhere, not just in that slice, thus informing memoized selector that it should recalculate its result.

## Recommended application structure
Strict-redux was written with the following applictioan structure in mind. Application consisits of at least three subsystems - state, UI and domain logic. UI and domain logic are not aware of each other's existance and communicate only via state. State is not aware of both of them and just reacts on actions and selector calls, distinguishing UI and and domian only with slight interface differences, such as `createMapStateToProps()` wrapper around `getSelectors()`. Typical UI component is connected to state like this:
```
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createMapStateToProps, createMapDispatchToProps } from '../State'

class LoginForm extends Component {
  // Login form implementation
}

export default connect(
  createMapStateToProps('auth'),
  createMapDispatchToProps('auth_login')
)(LoginForm)
```
On the other side of state subsistem there is the domain logic code, which implements authentication and does all async calls to a backend. It may listen to the actions via middleware like redux-saga, but, as sagas may be unfamiliar to the reader, let's assume we use very basic custom middleware, implementing action hooks, which are called right after the action passes reducer
```
import { RESTclient } from '../API'
import { getActions, selectOne } from '../State'

const { 
  auth_logout, 
  auth_loginSuccess, 
  auth_loginError 
  } = getActions('auth')
  
export const hooks = {
  auth_login: action => {

    // To illustrate selector usage, we assume that credentials are stored in the state. 
    RESTclient.login(selectOne('auth_credentials')) 
      .then(auth_loginSuccess)
      .catch(auth_loginError)
  },

  auth_logout: action => {
    RESTclient.logout()
  }
}
```
Auth state slice descriptor for our app may look like this:
```
export const sliceName = 'auth'

export const initialState = {
  isLoggingIn: true,
  user: undefined,
  credentials: undefined,
  error: undefined
}

export const actionReducers = {
  login: (stateSlice, payload) => ({
    isLoggingIn: true,
    credentials: payload
    error: undefined
  }),

  loginSuccess: (stateSlice, payload) => ({
    isLoggingIn: false,
    error: undefined,
    credentials: undefined,
    user: payload
  }),

  loginError: (stateSlice, payload) => ({
    isLoggingIn: false,
    credentials: undefined,
    error: payload.toString()
  }),

  logout: (stateSlice, payload) => ({
    user: undefined
  })
}

export function createSelectors (select, selectOne) {
  return {
    isLoggedIn: stateSlice => !!stateSlice.user
  }
}
```
Store creation code:
```
import logger from 'redux-logger'

import { createHooksMiddleware } from '../Utils/ActionHooksMiddleware'
import StrictRedux from 'strict-redux'

import * as auth from './Auth'
import * as todos from './Todos'

const Store = new StrictRedux(
  [auth, todos],
  [createHooksMiddleware, () => logger]
)

export const {
  createMapStateToProps,
  createMapDispatchToProps,
  getActions,
  getAction,
  getSelector,
  getSelectors,
  strictDispatch,
  selectOne,
  select,
  getStore
} = Store
```
Everything wired together:
```
import { Provider } from 'react-redux'
import React from 'react'
import ReactDOM from 'react-dom'

import domainServices from './Domain'
import { getStore } from './State'
import { registerHooks } from './Utils/ActionHooksMiddleware'
import UI from './UI'

domainServices.forEach(registerHooks)

ReactDOM.render(<Provider store={getStore()}>
  <UI/>
</Provider>, document.getElementById('root'))
```

