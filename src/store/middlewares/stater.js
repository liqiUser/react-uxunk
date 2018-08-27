export default ({getState, dispatch}) => (next) => (action) => {
    console.log(`---- 当前的 state: start ----`);
    console.log(getState());
    console.log(`---- 当前的 state:  end  ----`);
    next(action);
}