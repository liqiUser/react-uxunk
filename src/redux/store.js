import { createStore } from '../uxunk';

import reducer from './reducer';

const defaultState = {
    todo: [],
    filter: '全部'
}

const store = createStore(reducer, defaultState);

export default store;
