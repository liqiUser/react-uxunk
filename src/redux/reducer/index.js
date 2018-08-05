import { combineReducers } from '../../uxunk';

import filterReducer from './filterReducer';
import todoReducer from './todoReducer';

const reducer = {
    todo: todoReducer,
    filter: filterReducer
}

export default combineReducers({ reducer });
