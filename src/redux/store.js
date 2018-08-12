import { createStore } from '../uxunk';

import reducer from './reducer';

const defaultState = {
    todo: [],
    filter: 'all'
}

const store = createStore(reducer, defaultState);

export default store;
