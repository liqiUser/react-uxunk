import { createStore, applyMiddleware } from 'library/uxunk';

import { logger, stater } from './middlewares';

import reducer from './reducer';

const defaultState = {
    todo: [],
    filter: 'all'
}

const store = createStore(reducer, defaultState, applyMiddleware(logger, stater));

export default store;
