export default ({getState, dispatch}) => (next) => (action) => {
    console.log(`触发 action 事件: ${action.type}`);
    next(action);
}