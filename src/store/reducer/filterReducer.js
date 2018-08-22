import { filterActionType } from '../actionType';

export default function filterReducer(state, action) {
    switch (action.type) {
        case filterActionType.FILTER:
            return action.filterType
        default:
            return state;
    }
}
