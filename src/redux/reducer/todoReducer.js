import { todoActionType } from '../actionType';

export default function todoReducer(state = [], action) {
    let newState = JSON.parse(JSON.stringify(state));
    switch(action.type) {
        case todoActionType.ADD:
            const newList = {
                text: action.text,
                isFinish: false
            }
            newState.push(newList);
            return newState;
        case todoActionType.REMOVE:
            newState = newState.filter((item, index) => index !== action.removeId);
            return newState;
        case todoActionType.TOGGLE:
            newState.forEach((item, index) => {
                if (index === action.toggleId) {
                    item.isFinish = !item.isFinish
                }
            })
            return newState;
        default:
            return newState;
    }
}
