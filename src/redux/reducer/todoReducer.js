import { todoActionType } from '../actionType';

export default function todoReducer(state = [], action) {
    let newState = JSON.parse(JSON.stringify(state));
    switch(action.type) {
        case todoActionType.ADD:
            const newList = {
                id: state.length,
                text: action.text,
                isFinish: false
            }
            newState.push(newList);
            return newState;
        case todoActionType.REMOVE:
            newState.splice(action.removeId, 1);
            return newState;
        case todoActionType.TOGGLE:
            newState[action.toggleId].isFinish = !newState[action.toggleId].isFinish
            return newState;
        default:
            return newState;
    }
}
