import { todoActionType } from '../actionType';

export const addAction = (addText) => ({
    type: todoActionType.ADD,
    text: addText
})

export const reomveAction = (removeId) => ({
    type: todoActionType.REMOVE,
    removeId
})

export const toggleAction = (toggleId) => ({
    type: todoActionType.TOGGLE,
    toggleId
})
