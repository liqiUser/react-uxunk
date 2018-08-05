/**
 * compose 实现
 * 函数作用是将多个函数通过函数式编程的方式组合起来
 * 组合成一个可以链式调用的函数并返回它
 * 执行返回的函数将从 func 的最后一个函数开始调用
 * 倒数第二个函数以最后一个函数的返回值为参数开始执行，以此来推...
 *
 * @param {...Function} funcs 将所有传入的参数合成一个数组，每一个参数都是一个 function
 *
 * @return {Function} 返回一个经过 reduce 组合后的函数，类似于 a(b(c(d(...arg))))
 */
function compose(...funcs) {
    /**
     * 将 func 通过 reduce 组合起来
     * 例如 func = [a, b, c]
     * 第一次经过 reduce 返回结果 (...arg) => a(b(...arg))
     * 第二次经过 reduce 返回结果 (...arg) => ((...arg) => a(b(...arg)))(c(...arg))
     * 等于 (...arg) => a(b(c(...arg)))
     * 当我们执行这个结果时先执行 c 然后以 c 的结果执行 b...
     */
    return funcs.reduce((a, b) => (...arg) => a(b(...arg)));
}

// ---- 找机会写个单元测试 ----

// 模拟三个函数
function a1(data) {
    console.log(`a ${data}`);
    return data;
}
function b1(data) {
    console.log(`b ${data}`);
    return data;
}
function c1(data) {
    console.log(`c ${data}`);
    return data;
}

compose(a1, b1, c1);

/**
 * applyMiddleware 实现
 * 函数的作用是将你在 redux 中用到的所有中间件组合起来
 * 等待触发 dispatch 时依次触发所有中间件
 * 接收一个参数 middlewares 中间件们
 * @param {...Function} middlewares 所有中间件都是函数
 *
 * @return {Function} 返回一个可以接收 createStore 的函数
 * 在使用这个函数的情况下 store 的创建将在这个函数中进行
 */
function applyMiddleware(...middlewares) {
    /**
     * 配合 createStore 中的 enhancer 来实现有中间件的 store 的创建
     * 有中间件的 store 会在触发 dispatch 后，执行 reducer 前执行所有的中间件
     * applyMiddleware 返回的是一个柯里化的函数
     * 第一次接收 redux 的 createStore
     * 第二次接收创建 store 所需要的 reducer 和 preloadedState
     * 两次接收后创建 store
     */
    return createStore => (...args) => {
        /**
         * 讲一下中间件的格式，中间件是一个柯里化的函数
         * ({ dispatch, getState }) => next => action => { ... }
         * 第一层接收一个对象，里面是 getState 和 dispatch 方法
         * 第二层接收 next 是下一个中间件的函数，如果是最后一个 next 就是 store 的 dispatch 方法(不是后面声明的那个)
         * 第三层就是触发 dispatch 的 action 和我们了解的 redux 一样
         */
        const store = createStore(...args);
        /**
         * 写一个空的 dispatch 函数，这个 dispatch 将是用来链式触发中间件的 dispatch 方法
         * 这个 dispatch 不是真正 store 上的 dispatch，而是触发所有中间件的 dispatch
         * 声明 middlewareAPI 里面是所有中间件都需要用到的 getState 和 dispatch 方法
         * 在中间件中调用这里的 dispatch 方法将会重新走一遍所有中间件
         */
        let dispatch = () => {};

        const middlewareAPI = {
            getState: store.getState,
            dispatch: (...arg) => dispatch(...arg)
        };
        /**
         * 遍历传入的所有中间件，执行所有中间件的第一层函数，传入 getState 和 dispatch 方法
         */
        const chain = middlewares.map(middleware => middleware(middlewareAPI));
        /**
         * 我们将这部分拆开来看，首先 compose(...chain)
         * 经过这一步我们得到的是 (...arg) => 中间件1(中间件2(中间件3(...arg))) 这样的函数
         * compose(...chain)(store.dispatch)
         * arg = store.dispatch 中间件3的 next 就是 store.dispatch 函数，中间件3返回的函数 action => { ... }
         * 中间件2接收中间件3返回的 action => { ... } 作为中间件2的 next 然后返回自己的 action => { ... }
         * 最后返回中间件1的 action => { ... } ，中间件1的 next 是中间件2的 action => { ... } ,依次类推...
         * 当我们执行中间件1的 action => { ... } 中触发中间件1的 next 开始执行中间件2的 action => { ... } ,依次类推...
         * 最后执行中间件3的 next ，调用了 store.dispatch 函数
         * 相当于这个 dispatch 是用来触发所有中间件的，执行完所有中间件后，将执行真正的 store.dispatch 函数
         */
        dispatch = compose(...chain)(store.dispatch);

        /**
         * 将 store 的其他函数与经过封装的 dispatch 一同返回，形成新的完整的 store
         */
        return {
            dispatch,
            ...store
        };
    };
}

// ---- 找机会写个单元测试(因为这个模块需要配合 createStore 所以在这里只单独对功能经行测试) ----

// 模拟 compose
function simulationCompose(...funs) {
    return funs.reduce((a, b) => (...arg) => a(b(...arg)));
}

// 三个中间件
function thunk() {
    return (next) => {
        console.log('thunk 外层函数执行');
        console.log(next);

        return (action) => {
            console.log('这是 thunk 函数');

            return next(action);
        };
    };
}
function logger() {
    return (next) => {
        console.log('logger 外层函数执行');
        console.log(next);

        return (action) => {
            console.log('这是 logger 函数');

            return next(action);
        };
    };
}
function bugger() {
    return (next) => {
        console.log('bugger 外层函数执行');
        console.log(next);

        return (action) => {
            console.log('这是 bugger 函数');

            return next(action);
        };
    };
}

// 模拟 applyMiddleware 执行过程
const middlewares = [thunk, logger, bugger];
const chain = middlewares.map(middleware => middleware());

const dispatch = (data) => {
    console.log(data);
    return '执行完成返回 action';
};

const test = simulationCompose(...chain)(dispatch);

test('applyMiddleware 测试');

/**
 * bindActionCreators 实现
 * 函数的作用是将生成 action 的方法，与 dispatch 结合传递给子元素等
 * 接收两个参数 actionCreators 和 dispatch
 *
 * @param {Object} actionCreators 是一个或多个生成 action 的函数组成的 object
 *
 * @param {Function} dispatch 由 redux 的 createStore 生成的触发发布/订阅的方法
 *
 * @return {Object} 返回一个已经在每一个 actionCreator 上绑定了 dispatch 方法的对象
 */
function bindActionCreators(actionCreators, dispatch) {
    /**
     * 创建 boundActionCreators 作为将要返回的对象
     * 遍历 actionCreators 的所有属性，获取 actionCreator
     * 写一个方法执行，接收通过 actionCreator 生成 action 所需要的参数 arg
     * dispatch 和 actionCreator 由于闭包一直存在
     * 调用 (...arg) => dispatch(actionCreator(...arg)) 时
     * actionCreator(...arg) 返回 action
     * dispatch(action) 触发发布/订阅
     */
    const boundActionCreators = {};
    Object.keys(actionCreators).forEach((item) => {
        const actionCreator = actionCreators[item];
        boundActionCreators[item] = (...arg) => dispatch(actionCreator(...arg));
    });
    return boundActionCreators;
}

// ---- 找机会写个单元测试 ----

// 模拟 actionCreator
function addTodo(text) {
    return {
        type: 'ADD_TODO',
        text
    };
}

function removeTodo(id) {
    return {
        type: 'REMOVE_TODO',
        id
    };
}

// 模拟 actionCreators
const actionCreators = { addTodo, removeTodo };

// 模拟 dispatch
function simulationDispatch(action) {
    console.log(action);
    const result = `你触发了 ${action.type} 的 action`;
    return result;
}

bindActionCreators(actionCreators, simulationDispatch);

/**
 * combineReducers 实现
 * 函数的作用是将多个 reducer 按照 key: value 组成一个更大的 reducer
 * 接收一个参数 reducers
 *
 * @param {Object} reducers 是将多个 reducer 组合成的对象
 *
 * @return {Function} 返回真正替代 reducer 的函数
 */
function combineReducers(reducers = {}) {
    /**
     * combineReducers 函数返回一个 function
     * 这个函数是真正的 reducer 接收两个参数
     *
     * @param {Object} state 这个是整体的默认状态
     * @param {Object} action 用来触发 reducer 的对象，必有字段 action.type
     *
     * @return {Object} 返回完成的 state
     */
    return function combination(state = {}, action) {
        /**
         * 遍历 reducers 的所有属性，取得所有的 reducer
         * 为每个 reducer 传入对应的 state 和 所触发的 action
         * 将对应返回的 state 放入 nextState 中
         * 返回 nextState
         */
        const nextState = {};
        Object.keys(reducers).forEach((key) => {
            nextState[key] = reducers[key](state[key], action);
        });
        return nextState;
    };
}

// ---- 找机会写个单元测试 ----

// 模拟 state
let stateSimulation = {
    loginState: {
        login: false,
        name: '',
        id: null
    },
    indexState: {
        shopBoy: false,
        goodGirl: false,
        text: ''
    }
};

// 模拟 actionType
const loginActionType = 'LOGIN/ACTION';
const indexActionType = 'INDEX/ACTION';

// 模拟 action
const loginAction = {
    type: loginActionType,
    name: '梅乐凯',
    id: 1
};
const indexAction = {
    type: indexActionType,
    isPeople: true,
    text: '愚蠢的人类啊！'
};

// 模拟 reducer
function loginReducer(state, action) {
    switch (action.type) {
    case loginActionType:
        return {
            login: true,
            name: action.name,
            id: action.id
        };
    default:
        return state;
    }
}

function indexReducer(state, action) {
    switch (action.type) {
    case indexActionType:
        return {
            shopBoy: action.isPeople,
            goodGirl: action.isPeople,
            text: action.text
        };
    default:
        return state;
    }
}

// 组合 reducers
const text = combineReducers({
    loginState: loginReducer,
    indexState: indexReducer
});

stateSimulation = text(stateSimulation, loginAction);
console.log(stateSimulation);

stateSimulation = text(stateSimulation, indexAction);
console.log(stateSimulation);

/**
 * react-uxunk
 * 按照 redux 源码进行仿制
 * 发布/订阅模式
 * 拥有 redux 的几乎所有功能
 * @param {Function} reducer 用于存放所有的数据处理逻辑，返回下一个state树
 *
 * @param {Object} defaultState 默认的初始化 state
 *
 * @param {Function} enhancer 为 redux 提供所有中间件，只能使用'applyMiddleware'方法来生成
 *
 * @return {Object} 返回 store 里面包含 redux 所有数据及方法
 */
function createStore(reducer, defaultState, enhancer) {
    // 判断是不是没有 defaultState 只有 enhancer 如果是这样就交换一下
    if (typeof enhancer === 'undefined' && typeof defaultState === 'function') {
        enhancer = defaultState;
        defaultState = undefined;
    }
    // 如果有中间件就在中间件中执行 createStore
    if (typeof enhancer === 'function') {
        return enhancer(createStore)(reducer, defaultState);
    }

    let currentState = defaultState;
    let currentReducer = reducer;
    const currentListeners = [];

    /**
     * dispatch 函数，执行 reducer ，触发所有 listener
     *
     * @param {Object} action 触发发布/订阅的事件
     *
     * @return {Object} 执行后返回 action
     */
    function dispatch(action) {
        currentState = currentReducer(currentState, action);
        currentListeners.forEach(item => item());
        return action;
    }

    /**
     * getState 函数，返回经过深克隆的 state 树
     */
    function getState() {
        return JSON.parse(JSON.stringify(currentState));
    }

    /**
     * subscribe 函数，用于绑定 触发 dispatch 更新 state 时触发的函数
     *
     * @param {Function} fn 传入需要加入 listeners 绑定的函数
     *
     * @return {Function} 解除改函数绑定的方法
     */
    function subscribe(fn) {
        // 如果 fn 没有或不是一个 function 抛出错误
        if (!fn || typeof fn !== 'function') {
            throw Error('This function has been subscribed!');
        }
        // listeners 里没有这个时，加进去
        if (currentListeners.indexOf(fn) < 0) {
            currentListeners.push(fn);
        }
        // 返回解除 listeners 绑定的方法
        return function unsubscribe() {
            const index = currentListeners.indexOf(fn);
            if (index > 0) {
                currentListeners.splice(index, 1);
            }
        };
    }

    /**
     * replaceReducer 函数，接收一个新的 reducer 代替旧的
     *
     * @param {Function} newReducer 新的 reducer
     */
    function replaceReducer(newReducer) {
        currentReducer = newReducer;
    }
    return {
        subscribe,
        dispatch,
        getState,
        replaceReducer
    };
}

export { applyMiddleware, bindActionCreators, combineReducers, compose, createStore };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXh1bmsuanMiLCJzb3VyY2VzIjpbInNyYy9jb21wb3NlLmpzIiwic3JjL2FwcGx5TWlkZGxld2FyZS5qcyIsInNyYy9iaW5kQWN0aW9uQ3JlYXRvcnMuanMiLCJzcmMvY29tYmluZVJlZHVjZXJzLmpzIiwic3JjL2NyZWF0ZVN0b3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBjb21wb3NlIOWunueOsFxyXG4gKiDlh73mlbDkvZznlKjmmK/lsIblpJrkuKrlh73mlbDpgJrov4flh73mlbDlvI/nvJbnqIvnmoTmlrnlvI/nu4TlkIjotbfmnaVcclxuICog57uE5ZCI5oiQ5LiA5Liq5Y+v5Lul6ZO+5byP6LCD55So55qE5Ye95pWw5bm26L+U5Zue5a6DXHJcbiAqIOaJp+ihjOi/lOWbnueahOWHveaVsOWwhuS7jiBmdW5jIOeahOacgOWQjuS4gOS4quWHveaVsOW8gOWni+iwg+eUqFxyXG4gKiDlgJLmlbDnrKzkuozkuKrlh73mlbDku6XmnIDlkI7kuIDkuKrlh73mlbDnmoTov5Tlm57lgLzkuLrlj4LmlbDlvIDlp4vmiafooYzvvIzku6XmraTmnaXmjqguLi5cclxuICpcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gZnVuY3Mg5bCG5omA5pyJ5Lyg5YWl55qE5Y+C5pWw5ZCI5oiQ5LiA5Liq5pWw57uE77yM5q+P5LiA5Liq5Y+C5pWw6YO95piv5LiA5LiqIGZ1bmN0aW9uXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrnu4/ov4cgcmVkdWNlIOe7hOWQiOWQjueahOWHveaVsO+8jOexu+S8vOS6jiBhKGIoYyhkKC4uLmFyZykpKSlcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBvc2UoLi4uZnVuY3MpIHtcclxuICAgIC8qKlxyXG4gICAgICog5bCGIGZ1bmMg6YCa6L+HIHJlZHVjZSDnu4TlkIjotbfmnaVcclxuICAgICAqIOS+i+WmgiBmdW5jID0gW2EsIGIsIGNdXHJcbiAgICAgKiDnrKzkuIDmrKHnu4/ov4cgcmVkdWNlIOi/lOWbnue7k+aenCAoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSlcclxuICAgICAqIOesrOS6jOasoee7j+i/hyByZWR1Y2Ug6L+U5Zue57uT5p6cICguLi5hcmcpID0+ICgoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSkpKGMoLi4uYXJnKSlcclxuICAgICAqIOetieS6jiAoLi4uYXJnKSA9PiBhKGIoYyguLi5hcmcpKSlcclxuICAgICAqIOW9k+aIkeS7rOaJp+ihjOi/meS4que7k+aenOaXtuWFiOaJp+ihjCBjIOeEtuWQjuS7pSBjIOeahOe7k+aenOaJp+ihjCBiLi4uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jcy5yZWR1Y2UoKGEsIGIpID0+ICguLi5hcmcpID0+IGEoYiguLi5hcmcpKSk7XHJcbn1cclxuXHJcbi8vIC0tLS0g5om+5py65Lya5YaZ5Liq5Y2V5YWD5rWL6K+VIC0tLS1cclxuXHJcbi8vIOaooeaLn+S4ieS4quWHveaVsFxyXG5mdW5jdGlvbiBhMShkYXRhKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgYSAke2RhdGF9YCk7XHJcbiAgICByZXR1cm4gZGF0YTtcclxufVxyXG5mdW5jdGlvbiBiMShkYXRhKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgYiAke2RhdGF9YCk7XHJcbiAgICByZXR1cm4gZGF0YTtcclxufVxyXG5mdW5jdGlvbiBjMShkYXRhKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgYyAke2RhdGF9YCk7XHJcbiAgICByZXR1cm4gZGF0YTtcclxufVxyXG5cclxuY29tcG9zZShhMSwgYjEsIGMxKTtcclxuIiwiaW1wb3J0IGNvbXBvc2UgZnJvbSAnLi9jb21wb3NlJztcclxuLyoqXHJcbiAqIGFwcGx5TWlkZGxld2FyZSDlrp7njrBcclxuICog5Ye95pWw55qE5L2c55So5piv5bCG5L2g5ZyoIHJlZHV4IOS4reeUqOWIsOeahOaJgOacieS4remXtOS7tue7hOWQiOi1t+adpVxyXG4gKiDnrYnlvoXop6blj5EgZGlzcGF0Y2gg5pe25L6d5qyh6Kem5Y+R5omA5pyJ5Lit6Ze05Lu2XHJcbiAqIOaOpeaUtuS4gOS4quWPguaVsCBtaWRkbGV3YXJlcyDkuK3pl7Tku7bku6xcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gbWlkZGxld2FyZXMg5omA5pyJ5Lit6Ze05Lu26YO95piv5Ye95pWwXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrlj6/ku6XmjqXmlLYgY3JlYXRlU3RvcmUg55qE5Ye95pWwXHJcbiAqIOWcqOS9v+eUqOi/meS4quWHveaVsOeahOaDheWGteS4iyBzdG9yZSDnmoTliJvlu7rlsIblnKjov5nkuKrlh73mlbDkuK3ov5vooYxcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFwcGx5TWlkZGxld2FyZSguLi5taWRkbGV3YXJlcykge1xyXG4gICAgLyoqXHJcbiAgICAgKiDphY3lkIggY3JlYXRlU3RvcmUg5Lit55qEIGVuaGFuY2VyIOadpeWunueOsOacieS4remXtOS7tueahCBzdG9yZSDnmoTliJvlu7pcclxuICAgICAqIOacieS4remXtOS7tueahCBzdG9yZSDkvJrlnKjop6blj5EgZGlzcGF0Y2gg5ZCO77yM5omn6KGMIHJlZHVjZXIg5YmN5omn6KGM5omA5pyJ55qE5Lit6Ze05Lu2XHJcbiAgICAgKiBhcHBseU1pZGRsZXdhcmUg6L+U5Zue55qE5piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgKiDnrKzkuIDmrKHmjqXmlLYgcmVkdXgg55qEIGNyZWF0ZVN0b3JlXHJcbiAgICAgKiDnrKzkuozmrKHmjqXmlLbliJvlu7ogc3RvcmUg5omA6ZyA6KaB55qEIHJlZHVjZXIg5ZKMIHByZWxvYWRlZFN0YXRlXHJcbiAgICAgKiDkuKTmrKHmjqXmlLblkI7liJvlu7ogc3RvcmVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGNyZWF0ZVN0b3JlID0+ICguLi5hcmdzKSA9PiB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog6K6y5LiA5LiL5Lit6Ze05Lu255qE5qC85byP77yM5Lit6Ze05Lu25piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgICAgICogKHsgZGlzcGF0Y2gsIGdldFN0YXRlIH0pID0+IG5leHQgPT4gYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDnrKzkuIDlsYLmjqXmlLbkuIDkuKrlr7nosaHvvIzph4zpnaLmmK8gZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqIOesrOS6jOWxguaOpeaUtiBuZXh0IOaYr+S4i+S4gOS4quS4remXtOS7tueahOWHveaVsO+8jOWmguaenOaYr+acgOWQjuS4gOS4qiBuZXh0IOWwseaYryBzdG9yZSDnmoQgZGlzcGF0Y2gg5pa55rOVKOS4jeaYr+WQjumdouWjsOaYjueahOmCo+S4qilcclxuICAgICAgICAgKiDnrKzkuInlsYLlsLHmmK/op6blj5EgZGlzcGF0Y2gg55qEIGFjdGlvbiDlkozmiJHku6zkuobop6PnmoQgcmVkdXgg5LiA5qC3XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBjcmVhdGVTdG9yZSguLi5hcmdzKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlhpnkuIDkuKrnqbrnmoQgZGlzcGF0Y2gg5Ye95pWw77yM6L+Z5LiqIGRpc3BhdGNoIOWwhuaYr+eUqOadpemTvuW8j+inpuWPkeS4remXtOS7tueahCBkaXNwYXRjaCDmlrnms5VcclxuICAgICAgICAgKiDov5nkuKogZGlzcGF0Y2gg5LiN5piv55yf5q2jIHN0b3JlIOS4iueahCBkaXNwYXRjaO+8jOiAjOaYr+inpuWPkeaJgOacieS4remXtOS7tueahCBkaXNwYXRjaFxyXG4gICAgICAgICAqIOWjsOaYjiBtaWRkbGV3YXJlQVBJIOmHjOmdouaYr+aJgOacieS4remXtOS7tumDvemcgOimgeeUqOWIsOeahCBnZXRTdGF0ZSDlkowgZGlzcGF0Y2gg5pa55rOVXHJcbiAgICAgICAgICog5Zyo5Lit6Ze05Lu25Lit6LCD55So6L+Z6YeM55qEIGRpc3BhdGNoIOaWueazleWwhuS8mumHjeaWsOi1sOS4gOmBjeaJgOacieS4remXtOS7tlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGxldCBkaXNwYXRjaCA9ICgpID0+IHt9O1xyXG5cclxuICAgICAgICBjb25zdCBtaWRkbGV3YXJlQVBJID0ge1xyXG4gICAgICAgICAgICBnZXRTdGF0ZTogc3RvcmUuZ2V0U3RhdGUsXHJcbiAgICAgICAgICAgIGRpc3BhdGNoOiAoLi4uYXJnKSA9PiBkaXNwYXRjaCguLi5hcmcpXHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDpgY3ljobkvKDlhaXnmoTmiYDmnInkuK3pl7Tku7bvvIzmiafooYzmiYDmnInkuK3pl7Tku7bnmoTnrKzkuIDlsYLlh73mlbDvvIzkvKDlhaUgZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGNoYWluID0gbWlkZGxld2FyZXMubWFwKG1pZGRsZXdhcmUgPT4gbWlkZGxld2FyZShtaWRkbGV3YXJlQVBJKSk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog5oiR5Lus5bCG6L+Z6YOo5YiG5ouG5byA5p2l55yL77yM6aaW5YWIIGNvbXBvc2UoLi4uY2hhaW4pXHJcbiAgICAgICAgICog57uP6L+H6L+Z5LiA5q2l5oiR5Lus5b6X5Yiw55qE5pivICguLi5hcmcpID0+IOS4remXtOS7tjEo5Lit6Ze05Lu2MijkuK3pl7Tku7YzKC4uLmFyZykpKSDov5nmoLfnmoTlh73mlbBcclxuICAgICAgICAgKiBjb21wb3NlKC4uLmNoYWluKShzdG9yZS5kaXNwYXRjaClcclxuICAgICAgICAgKiBhcmcgPSBzdG9yZS5kaXNwYXRjaCDkuK3pl7Tku7Yz55qEIG5leHQg5bCx5pivIHN0b3JlLmRpc3BhdGNoIOWHveaVsO+8jOS4remXtOS7tjPov5Tlm57nmoTlh73mlbAgYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDkuK3pl7Tku7Yy5o6l5pS25Lit6Ze05Lu2M+i/lOWbnueahCBhY3Rpb24gPT4geyAuLi4gfSDkvZzkuLrkuK3pl7Tku7Yy55qEIG5leHQg54S25ZCO6L+U5Zue6Ieq5bex55qEIGFjdGlvbiA9PiB7IC4uLiB9XHJcbiAgICAgICAgICog5pyA5ZCO6L+U5Zue5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDvvIzkuK3pl7Tku7Yx55qEIG5leHQg5piv5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5b2T5oiR5Lus5omn6KGM5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDkuK3op6blj5HkuK3pl7Tku7Yx55qEIG5leHQg5byA5aeL5omn6KGM5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5pyA5ZCO5omn6KGM5Lit6Ze05Lu2M+eahCBuZXh0IO+8jOiwg+eUqOS6hiBzdG9yZS5kaXNwYXRjaCDlh73mlbBcclxuICAgICAgICAgKiDnm7jlvZPkuo7ov5nkuKogZGlzcGF0Y2gg5piv55So5p2l6Kem5Y+R5omA5pyJ5Lit6Ze05Lu255qE77yM5omn6KGM5a6M5omA5pyJ5Lit6Ze05Lu25ZCO77yM5bCG5omn6KGM55yf5q2j55qEIHN0b3JlLmRpc3BhdGNoIOWHveaVsFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGRpc3BhdGNoID0gY29tcG9zZSguLi5jaGFpbikoc3RvcmUuZGlzcGF0Y2gpO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlsIYgc3RvcmUg55qE5YW25LuW5Ye95pWw5LiO57uP6L+H5bCB6KOF55qEIGRpc3BhdGNoIOS4gOWQjOi/lOWbnu+8jOW9ouaIkOaWsOeahOWujOaVtOeahCBzdG9yZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGRpc3BhdGNoLFxyXG4gICAgICAgICAgICAuLi5zdG9yZVxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG59XHJcblxyXG4vLyAtLS0tIOaJvuacuuS8muWGmeS4quWNleWFg+a1i+ivlSjlm6DkuLrov5nkuKrmqKHlnZfpnIDopoHphY3lkIggY3JlYXRlU3RvcmUg5omA5Lul5Zyo6L+Z6YeM5Y+q5Y2V54us5a+55Yqf6IO957uP6KGM5rWL6K+VKSAtLS0tXHJcblxyXG4vLyDmqKHmi58gY29tcG9zZVxyXG5mdW5jdGlvbiBzaW11bGF0aW9uQ29tcG9zZSguLi5mdW5zKSB7XHJcbiAgICByZXR1cm4gZnVucy5yZWR1Y2UoKGEsIGIpID0+ICguLi5hcmcpID0+IGEoYiguLi5hcmcpKSk7XHJcbn1cclxuXHJcbi8vIOS4ieS4quS4remXtOS7tlxyXG5mdW5jdGlvbiB0aHVuaygpIHtcclxuICAgIHJldHVybiAobmV4dCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCd0aHVuayDlpJblsYLlh73mlbDmiafooYwnKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhuZXh0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIChhY3Rpb24pID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+i/meaYryB0aHVuayDlh73mlbAnKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBuZXh0KGFjdGlvbik7XHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcbn1cclxuZnVuY3Rpb24gbG9nZ2VyKCkge1xyXG4gICAgcmV0dXJuIChuZXh0KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2xvZ2dlciDlpJblsYLlh73mlbDmiafooYwnKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhuZXh0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIChhY3Rpb24pID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+i/meaYryBsb2dnZXIg5Ye95pWwJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbmV4dChhY3Rpb24pO1xyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG59XHJcbmZ1bmN0aW9uIGJ1Z2dlcigpIHtcclxuICAgIHJldHVybiAobmV4dCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdidWdnZXIg5aSW5bGC5Ye95pWw5omn6KGMJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2cobmV4dCk7XHJcblxyXG4gICAgICAgIHJldHVybiAoYWN0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfov5nmmK8gYnVnZ2VyIOWHveaVsCcpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5leHQoYWN0aW9uKTtcclxuICAgICAgICB9O1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8g5qih5oufIGFwcGx5TWlkZGxld2FyZSDmiafooYzov4fnqItcclxuY29uc3QgbWlkZGxld2FyZXMgPSBbdGh1bmssIGxvZ2dlciwgYnVnZ2VyXTtcclxuY29uc3QgY2hhaW4gPSBtaWRkbGV3YXJlcy5tYXAobWlkZGxld2FyZSA9PiBtaWRkbGV3YXJlKCkpO1xyXG5cclxuY29uc3QgZGlzcGF0Y2ggPSAoZGF0YSkgPT4ge1xyXG4gICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICByZXR1cm4gJ+aJp+ihjOWujOaIkOi/lOWbniBhY3Rpb24nO1xyXG59O1xyXG5cclxuY29uc3QgdGVzdCA9IHNpbXVsYXRpb25Db21wb3NlKC4uLmNoYWluKShkaXNwYXRjaCk7XHJcblxyXG50ZXN0KCdhcHBseU1pZGRsZXdhcmUg5rWL6K+VJyk7XHJcbiIsIi8qKlxyXG4gKiBiaW5kQWN0aW9uQ3JlYXRvcnMg5a6e546wXHJcbiAqIOWHveaVsOeahOS9nOeUqOaYr+WwhueUn+aIkCBhY3Rpb24g55qE5pa55rOV77yM5LiOIGRpc3BhdGNoIOe7k+WQiOS8oOmAkue7meWtkOWFg+e0oOetiVxyXG4gKiDmjqXmlLbkuKTkuKrlj4LmlbAgYWN0aW9uQ3JlYXRvcnMg5ZKMIGRpc3BhdGNoXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBhY3Rpb25DcmVhdG9ycyDmmK/kuIDkuKrmiJblpJrkuKrnlJ/miJAgYWN0aW9uIOeahOWHveaVsOe7hOaIkOeahCBvYmplY3RcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZGlzcGF0Y2gg55SxIHJlZHV4IOeahCBjcmVhdGVTdG9yZSDnlJ/miJDnmoTop6blj5Hlj5HluIMv6K6i6ZiF55qE5pa55rOVXHJcbiAqXHJcbiAqIEByZXR1cm4ge09iamVjdH0g6L+U5Zue5LiA5Liq5bey57uP5Zyo5q+P5LiA5LiqIGFjdGlvbkNyZWF0b3Ig5LiK57uR5a6a5LqGIGRpc3BhdGNoIOaWueazleeahOWvueixoVxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYmluZEFjdGlvbkNyZWF0b3JzKGFjdGlvbkNyZWF0b3JzLCBkaXNwYXRjaCkge1xyXG4gICAgLyoqXHJcbiAgICAgKiDliJvlu7ogYm91bmRBY3Rpb25DcmVhdG9ycyDkvZzkuLrlsIbopoHov5Tlm57nmoTlr7nosaFcclxuICAgICAqIOmBjeWOhiBhY3Rpb25DcmVhdG9ycyDnmoTmiYDmnInlsZ7mgKfvvIzojrflj5YgYWN0aW9uQ3JlYXRvclxyXG4gICAgICog5YaZ5LiA5Liq5pa55rOV5omn6KGM77yM5o6l5pS26YCa6L+HIGFjdGlvbkNyZWF0b3Ig55Sf5oiQIGFjdGlvbiDmiYDpnIDopoHnmoTlj4LmlbAgYXJnXHJcbiAgICAgKiBkaXNwYXRjaCDlkowgYWN0aW9uQ3JlYXRvciDnlLHkuo7pl63ljIXkuIDnm7TlrZjlnKhcclxuICAgICAqIOiwg+eUqCAoLi4uYXJnKSA9PiBkaXNwYXRjaChhY3Rpb25DcmVhdG9yKC4uLmFyZykpIOaXtlxyXG4gICAgICogYWN0aW9uQ3JlYXRvciguLi5hcmcpIOi/lOWbniBhY3Rpb25cclxuICAgICAqIGRpc3BhdGNoKGFjdGlvbikg6Kem5Y+R5Y+R5biDL+iuoumYhVxyXG4gICAgICovXHJcbiAgICBjb25zdCBib3VuZEFjdGlvbkNyZWF0b3JzID0ge307XHJcbiAgICBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGFjdGlvbkNyZWF0b3IgPSBhY3Rpb25DcmVhdG9yc1tpdGVtXTtcclxuICAgICAgICBib3VuZEFjdGlvbkNyZWF0b3JzW2l0ZW1dID0gKC4uLmFyZykgPT4gZGlzcGF0Y2goYWN0aW9uQ3JlYXRvciguLi5hcmcpKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGJvdW5kQWN0aW9uQ3JlYXRvcnM7XHJcbn1cclxuXHJcbi8vIC0tLS0g5om+5py65Lya5YaZ5Liq5Y2V5YWD5rWL6K+VIC0tLS1cclxuXHJcbi8vIOaooeaLnyBhY3Rpb25DcmVhdG9yXHJcbmZ1bmN0aW9uIGFkZFRvZG8odGV4dCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB0eXBlOiAnQUREX1RPRE8nLFxyXG4gICAgICAgIHRleHRcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVRvZG8oaWQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgdHlwZTogJ1JFTU9WRV9UT0RPJyxcclxuICAgICAgICBpZFxyXG4gICAgfTtcclxufVxyXG5cclxuLy8g5qih5oufIGFjdGlvbkNyZWF0b3JzXHJcbmNvbnN0IGFjdGlvbkNyZWF0b3JzID0geyBhZGRUb2RvLCByZW1vdmVUb2RvIH07XHJcblxyXG4vLyDmqKHmi58gZGlzcGF0Y2hcclxuZnVuY3Rpb24gc2ltdWxhdGlvbkRpc3BhdGNoKGFjdGlvbikge1xyXG4gICAgY29uc29sZS5sb2coYWN0aW9uKTtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGDkvaDop6blj5HkuoYgJHthY3Rpb24udHlwZX0g55qEIGFjdGlvbmA7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5iaW5kQWN0aW9uQ3JlYXRvcnMoYWN0aW9uQ3JlYXRvcnMsIHNpbXVsYXRpb25EaXNwYXRjaCk7XHJcbiIsIi8qKlxyXG4gKiBjb21iaW5lUmVkdWNlcnMg5a6e546wXHJcbiAqIOWHveaVsOeahOS9nOeUqOaYr+WwhuWkmuS4qiByZWR1Y2VyIOaMieeFpyBrZXk6IHZhbHVlIOe7hOaIkOS4gOS4quabtOWkp+eahCByZWR1Y2VyXHJcbiAqIOaOpeaUtuS4gOS4quWPguaVsCByZWR1Y2Vyc1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gcmVkdWNlcnMg5piv5bCG5aSa5LiqIHJlZHVjZXIg57uE5ZCI5oiQ55qE5a+56LGhXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57nnJ/mraPmm7/ku6MgcmVkdWNlciDnmoTlh73mlbBcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbWJpbmVSZWR1Y2VycyhyZWR1Y2VycyA9IHt9KSB7XHJcbiAgICAvKipcclxuICAgICAqIGNvbWJpbmVSZWR1Y2VycyDlh73mlbDov5Tlm57kuIDkuKogZnVuY3Rpb25cclxuICAgICAqIOi/meS4quWHveaVsOaYr+ecn+ato+eahCByZWR1Y2VyIOaOpeaUtuS4pOS4quWPguaVsFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSDov5nkuKrmmK/mlbTkvZPnmoTpu5jorqTnirbmgIFcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhY3Rpb24g55So5p2l6Kem5Y+RIHJlZHVjZXIg55qE5a+56LGh77yM5b+F5pyJ5a2X5q61IGFjdGlvbi50eXBlXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybiB7T2JqZWN0fSDov5Tlm57lrozmiJDnmoQgc3RhdGVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNvbWJpbmF0aW9uKHN0YXRlID0ge30sIGFjdGlvbikge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIOmBjeWOhiByZWR1Y2VycyDnmoTmiYDmnInlsZ7mgKfvvIzlj5blvpfmiYDmnInnmoQgcmVkdWNlclxyXG4gICAgICAgICAqIOS4uuavj+S4qiByZWR1Y2VyIOS8oOWFpeWvueW6lOeahCBzdGF0ZSDlkowg5omA6Kem5Y+R55qEIGFjdGlvblxyXG4gICAgICAgICAqIOWwhuWvueW6lOi/lOWbnueahCBzdGF0ZSDmlL7lhaUgbmV4dFN0YXRlIOS4rVxyXG4gICAgICAgICAqIOi/lOWbniBuZXh0U3RhdGVcclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdCBuZXh0U3RhdGUgPSB7fTtcclxuICAgICAgICBPYmplY3Qua2V5cyhyZWR1Y2VycykuZm9yRWFjaCgoa2V5KSA9PiB7XHJcbiAgICAgICAgICAgIG5leHRTdGF0ZVtrZXldID0gcmVkdWNlcnNba2V5XShzdGF0ZVtrZXldLCBhY3Rpb24pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vLyAtLS0tIOaJvuacuuS8muWGmeS4quWNleWFg+a1i+ivlSAtLS0tXHJcblxyXG4vLyDmqKHmi58gc3RhdGVcclxubGV0IHN0YXRlU2ltdWxhdGlvbiA9IHtcclxuICAgIGxvZ2luU3RhdGU6IHtcclxuICAgICAgICBsb2dpbjogZmFsc2UsXHJcbiAgICAgICAgbmFtZTogJycsXHJcbiAgICAgICAgaWQ6IG51bGxcclxuICAgIH0sXHJcbiAgICBpbmRleFN0YXRlOiB7XHJcbiAgICAgICAgc2hvcEJveTogZmFsc2UsXHJcbiAgICAgICAgZ29vZEdpcmw6IGZhbHNlLFxyXG4gICAgICAgIHRleHQ6ICcnXHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyDmqKHmi58gYWN0aW9uVHlwZVxyXG5jb25zdCBsb2dpbkFjdGlvblR5cGUgPSAnTE9HSU4vQUNUSU9OJztcclxuY29uc3QgaW5kZXhBY3Rpb25UeXBlID0gJ0lOREVYL0FDVElPTic7XHJcblxyXG4vLyDmqKHmi58gYWN0aW9uXHJcbmNvbnN0IGxvZ2luQWN0aW9uID0ge1xyXG4gICAgdHlwZTogbG9naW5BY3Rpb25UeXBlLFxyXG4gICAgbmFtZTogJ+aiheS5kOWHrycsXHJcbiAgICBpZDogMVxyXG59O1xyXG5jb25zdCBpbmRleEFjdGlvbiA9IHtcclxuICAgIHR5cGU6IGluZGV4QWN0aW9uVHlwZSxcclxuICAgIGlzUGVvcGxlOiB0cnVlLFxyXG4gICAgdGV4dDogJ+aEmuigoueahOS6uuexu+WViu+8gSdcclxufTtcclxuXHJcbi8vIOaooeaLnyByZWR1Y2VyXHJcbmZ1bmN0aW9uIGxvZ2luUmVkdWNlcihzdGF0ZSwgYWN0aW9uKSB7XHJcbiAgICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XHJcbiAgICBjYXNlIGxvZ2luQWN0aW9uVHlwZTpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBsb2dpbjogdHJ1ZSxcclxuICAgICAgICAgICAgbmFtZTogYWN0aW9uLm5hbWUsXHJcbiAgICAgICAgICAgIGlkOiBhY3Rpb24uaWRcclxuICAgICAgICB9O1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gc3RhdGU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluZGV4UmVkdWNlcihzdGF0ZSwgYWN0aW9uKSB7XHJcbiAgICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XHJcbiAgICBjYXNlIGluZGV4QWN0aW9uVHlwZTpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzaG9wQm95OiBhY3Rpb24uaXNQZW9wbGUsXHJcbiAgICAgICAgICAgIGdvb2RHaXJsOiBhY3Rpb24uaXNQZW9wbGUsXHJcbiAgICAgICAgICAgIHRleHQ6IGFjdGlvbi50ZXh0XHJcbiAgICAgICAgfTtcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyDnu4TlkIggcmVkdWNlcnNcclxuY29uc3QgdGV4dCA9IGNvbWJpbmVSZWR1Y2Vycyh7XHJcbiAgICBsb2dpblN0YXRlOiBsb2dpblJlZHVjZXIsXHJcbiAgICBpbmRleFN0YXRlOiBpbmRleFJlZHVjZXJcclxufSk7XHJcblxyXG5zdGF0ZVNpbXVsYXRpb24gPSB0ZXh0KHN0YXRlU2ltdWxhdGlvbiwgbG9naW5BY3Rpb24pO1xyXG5jb25zb2xlLmxvZyhzdGF0ZVNpbXVsYXRpb24pO1xyXG5cclxuc3RhdGVTaW11bGF0aW9uID0gdGV4dChzdGF0ZVNpbXVsYXRpb24sIGluZGV4QWN0aW9uKTtcclxuY29uc29sZS5sb2coc3RhdGVTaW11bGF0aW9uKTtcclxuIiwiLyoqXHJcbiAqIHJlYWN0LXV4dW5rXHJcbiAqIOaMieeFpyByZWR1eCDmupDnoIHov5vooYzku7/liLZcclxuICog5Y+R5biDL+iuoumYheaooeW8j1xyXG4gKiDmi6XmnIkgcmVkdXgg55qE5Yeg5LmO5omA5pyJ5Yqf6IO9XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlZHVjZXIg55So5LqO5a2Y5pS+5omA5pyJ55qE5pWw5o2u5aSE55CG6YC76L6R77yM6L+U5Zue5LiL5LiA5Liqc3RhdGXmoJFcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRTdGF0ZSDpu5jorqTnmoTliJ3lp4vljJYgc3RhdGVcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZW5oYW5jZXIg5Li6IHJlZHV4IOaPkOS+m+aJgOacieS4remXtOS7tu+8jOWPquiDveS9v+eUqCdhcHBseU1pZGRsZXdhcmUn5pa55rOV5p2l55Sf5oiQXHJcbiAqXHJcbiAqIEByZXR1cm4ge09iamVjdH0g6L+U5ZueIHN0b3JlIOmHjOmdouWMheWQqyByZWR1eCDmiYDmnInmlbDmja7lj4rmlrnms5VcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZVN0b3JlKHJlZHVjZXIsIGRlZmF1bHRTdGF0ZSwgZW5oYW5jZXIpIHtcclxuICAgIC8vIOWIpOaWreaYr+S4jeaYr+ayoeaciSBkZWZhdWx0U3RhdGUg5Y+q5pyJIGVuaGFuY2VyIOWmguaenOaYr+i/meagt+WwseS6pOaNouS4gOS4i1xyXG4gICAgaWYgKHR5cGVvZiBlbmhhbmNlciA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGRlZmF1bHRTdGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIGVuaGFuY2VyID0gZGVmYXVsdFN0YXRlO1xyXG4gICAgICAgIGRlZmF1bHRTdGF0ZSA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIC8vIOWmguaenOacieS4remXtOS7tuWwseWcqOS4remXtOS7tuS4reaJp+ihjCBjcmVhdGVTdG9yZVxyXG4gICAgaWYgKHR5cGVvZiBlbmhhbmNlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJldHVybiBlbmhhbmNlcihjcmVhdGVTdG9yZSkocmVkdWNlciwgZGVmYXVsdFN0YXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgY3VycmVudFN0YXRlID0gZGVmYXVsdFN0YXRlO1xyXG4gICAgbGV0IGN1cnJlbnRSZWR1Y2VyID0gcmVkdWNlcjtcclxuICAgIGNvbnN0IGN1cnJlbnRMaXN0ZW5lcnMgPSBbXTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGRpc3BhdGNoIOWHveaVsO+8jOaJp+ihjCByZWR1Y2VyIO+8jOinpuWPkeaJgOaciSBsaXN0ZW5lclxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhY3Rpb24g6Kem5Y+R5Y+R5biDL+iuoumYheeahOS6i+S7tlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm4ge09iamVjdH0g5omn6KGM5ZCO6L+U5ZueIGFjdGlvblxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb24pIHtcclxuICAgICAgICBjdXJyZW50U3RhdGUgPSBjdXJyZW50UmVkdWNlcihjdXJyZW50U3RhdGUsIGFjdGlvbik7XHJcbiAgICAgICAgY3VycmVudExpc3RlbmVycy5mb3JFYWNoKGl0ZW0gPT4gaXRlbSgpKTtcclxuICAgICAgICByZXR1cm4gYWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZ2V0U3RhdGUg5Ye95pWw77yM6L+U5Zue57uP6L+H5rex5YWL6ZqG55qEIHN0YXRlIOagkVxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcclxuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdXJyZW50U3RhdGUpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHN1YnNjcmliZSDlh73mlbDvvIznlKjkuo7nu5Hlrpog6Kem5Y+RIGRpc3BhdGNoIOabtOaWsCBzdGF0ZSDml7bop6blj5HnmoTlh73mlbBcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiDkvKDlhaXpnIDopoHliqDlhaUgbGlzdGVuZXJzIOe7keWumueahOWHveaVsFxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSDop6PpmaTmlLnlh73mlbDnu5HlrprnmoTmlrnms5VcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gc3Vic2NyaWJlKGZuKSB7XHJcbiAgICAgICAgLy8g5aaC5p6cIGZuIOayoeacieaIluS4jeaYr+S4gOS4qiBmdW5jdGlvbiDmipvlh7rplJnor69cclxuICAgICAgICBpZiAoIWZuIHx8IHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcignVGhpcyBmdW5jdGlvbiBoYXMgYmVlbiBzdWJzY3JpYmVkIScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBsaXN0ZW5lcnMg6YeM5rKh5pyJ6L+Z5Liq5pe277yM5Yqg6L+b5Y67XHJcbiAgICAgICAgaWYgKGN1cnJlbnRMaXN0ZW5lcnMuaW5kZXhPZihmbikgPCAwKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRMaXN0ZW5lcnMucHVzaChmbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIOi/lOWbnuino+mZpCBsaXN0ZW5lcnMg57uR5a6a55qE5pa55rOVXHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHVuc3Vic2NyaWJlKCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IGN1cnJlbnRMaXN0ZW5lcnMuaW5kZXhPZihmbik7XHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRMaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXBsYWNlUmVkdWNlciDlh73mlbDvvIzmjqXmlLbkuIDkuKrmlrDnmoQgcmVkdWNlciDku6Pmm7/ml6fnmoRcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXdSZWR1Y2VyIOaWsOeahCByZWR1Y2VyXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHJlcGxhY2VSZWR1Y2VyKG5ld1JlZHVjZXIpIHtcclxuICAgICAgICBjdXJyZW50UmVkdWNlciA9IG5ld1JlZHVjZXI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1YnNjcmliZSxcclxuICAgICAgICBkaXNwYXRjaCxcclxuICAgICAgICBnZXRTdGF0ZSxcclxuICAgICAgICByZXBsYWNlUmVkdWNlclxyXG4gICAgfTtcclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0FBV0EsQUFBZSxTQUFTLE9BQU8sQ0FBQyxHQUFHLEtBQUssRUFBRTs7Ozs7Ozs7O0lBU3RDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzNEOzs7OztBQUtELFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRTtJQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sSUFBSSxDQUFDO0NBQ2Y7QUFDRCxTQUFTLEVBQUUsQ0FBQyxJQUFJLEVBQUU7SUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMs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
