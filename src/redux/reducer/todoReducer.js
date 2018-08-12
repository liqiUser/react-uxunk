import { todoActionType } from '../actionType';

let i = 0;

export default function todoReducer(state = [], action) {
    let newState = JSON.parse(JSON.stringify(state));
    switch(action.type) {
        case todoActionType.ADD:
            const newList = {
                id: i++,
                text: action.text,
                isFinish: false
            }
            newState.push(newList);
            return newState;
        case todoActionType.REMOVE:
            newState = newState.filter(item => item.id !== action.removeId);
            return newState;
        case todoActionType.TOGGLE:
            newState.forEach(item => {
                if (item.id === action.toggleId) {
                    item.isFinish = !item.isFinish
                }
            })
            return newState;
        default:
            return newState;
    }
}
