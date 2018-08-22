import { createStore } from 'library/uxunk';

import reducer from './reducer';

const defaultState = {
    todo: [],
    filter: 'all'
}

const store = createStore(reducer, defaultState);

export default store;
