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

/**
 * uxunk
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
        /**
         * 内置 redux-thunk
         * 判断如果 action 是一个 function 就执行它
         */
        if (typeof action === 'function') {
            action();
            return false;
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXh1bmsuanMiLCJzb3VyY2VzIjpbInNyYy9jb21wb3NlLmpzIiwic3JjL2FwcGx5TWlkZGxld2FyZS5qcyIsInNyYy9iaW5kQWN0aW9uQ3JlYXRvcnMuanMiLCJzcmMvY29tYmluZVJlZHVjZXJzLmpzIiwic3JjL2NyZWF0ZVN0b3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBjb21wb3NlIOWunueOsFxyXG4gKiDlh73mlbDkvZznlKjmmK/lsIblpJrkuKrlh73mlbDpgJrov4flh73mlbDlvI/nvJbnqIvnmoTmlrnlvI/nu4TlkIjotbfmnaVcclxuICog57uE5ZCI5oiQ5LiA5Liq5Y+v5Lul6ZO+5byP6LCD55So55qE5Ye95pWw5bm26L+U5Zue5a6DXHJcbiAqIOaJp+ihjOi/lOWbnueahOWHveaVsOWwhuS7jiBmdW5jIOeahOacgOWQjuS4gOS4quWHveaVsOW8gOWni+iwg+eUqFxyXG4gKiDlgJLmlbDnrKzkuozkuKrlh73mlbDku6XmnIDlkI7kuIDkuKrlh73mlbDnmoTov5Tlm57lgLzkuLrlj4LmlbDlvIDlp4vmiafooYzvvIzku6XmraTmnaXmjqguLi5cclxuICpcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gZnVuY3Mg5bCG5omA5pyJ5Lyg5YWl55qE5Y+C5pWw5ZCI5oiQ5LiA5Liq5pWw57uE77yM5q+P5LiA5Liq5Y+C5pWw6YO95piv5LiA5LiqIGZ1bmN0aW9uXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrnu4/ov4cgcmVkdWNlIOe7hOWQiOWQjueahOWHveaVsO+8jOexu+S8vOS6jiBhKGIoYyhkKC4uLmFyZykpKSlcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBvc2UoLi4uZnVuY3MpIHtcclxuICAgIC8qKlxyXG4gICAgICog5bCGIGZ1bmMg6YCa6L+HIHJlZHVjZSDnu4TlkIjotbfmnaVcclxuICAgICAqIOS+i+WmgiBmdW5jID0gW2EsIGIsIGNdXHJcbiAgICAgKiDnrKzkuIDmrKHnu4/ov4cgcmVkdWNlIOi/lOWbnue7k+aenCAoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSlcclxuICAgICAqIOesrOS6jOasoee7j+i/hyByZWR1Y2Ug6L+U5Zue57uT5p6cICguLi5hcmcpID0+ICgoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSkpKGMoLi4uYXJnKSlcclxuICAgICAqIOetieS6jiAoLi4uYXJnKSA9PiBhKGIoYyguLi5hcmcpKSlcclxuICAgICAqIOW9k+aIkeS7rOaJp+ihjOi/meS4que7k+aenOaXtuWFiOaJp+ihjCBjIOeEtuWQjuS7pSBjIOeahOe7k+aenOaJp+ihjCBiLi4uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jcy5yZWR1Y2UoKGEsIGIpID0+ICguLi5hcmcpID0+IGEoYiguLi5hcmcpKSk7XHJcbn1cclxuIiwiaW1wb3J0IGNvbXBvc2UgZnJvbSAnLi9jb21wb3NlJztcclxuLyoqXHJcbiAqIGFwcGx5TWlkZGxld2FyZSDlrp7njrBcclxuICog5Ye95pWw55qE5L2c55So5piv5bCG5L2g5ZyoIHJlZHV4IOS4reeUqOWIsOeahOaJgOacieS4remXtOS7tue7hOWQiOi1t+adpVxyXG4gKiDnrYnlvoXop6blj5EgZGlzcGF0Y2gg5pe25L6d5qyh6Kem5Y+R5omA5pyJ5Lit6Ze05Lu2XHJcbiAqIOaOpeaUtuS4gOS4quWPguaVsCBtaWRkbGV3YXJlcyDkuK3pl7Tku7bku6xcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gbWlkZGxld2FyZXMg5omA5pyJ5Lit6Ze05Lu26YO95piv5Ye95pWwXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrlj6/ku6XmjqXmlLYgY3JlYXRlU3RvcmUg55qE5Ye95pWwXHJcbiAqIOWcqOS9v+eUqOi/meS4quWHveaVsOeahOaDheWGteS4iyBzdG9yZSDnmoTliJvlu7rlsIblnKjov5nkuKrlh73mlbDkuK3ov5vooYxcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFwcGx5TWlkZGxld2FyZSguLi5taWRkbGV3YXJlcykge1xyXG4gICAgLyoqXHJcbiAgICAgKiDphY3lkIggY3JlYXRlU3RvcmUg5Lit55qEIGVuaGFuY2VyIOadpeWunueOsOacieS4remXtOS7tueahCBzdG9yZSDnmoTliJvlu7pcclxuICAgICAqIOacieS4remXtOS7tueahCBzdG9yZSDkvJrlnKjop6blj5EgZGlzcGF0Y2gg5ZCO77yM5omn6KGMIHJlZHVjZXIg5YmN5omn6KGM5omA5pyJ55qE5Lit6Ze05Lu2XHJcbiAgICAgKiBhcHBseU1pZGRsZXdhcmUg6L+U5Zue55qE5piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgKiDnrKzkuIDmrKHmjqXmlLYgcmVkdXgg55qEIGNyZWF0ZVN0b3JlXHJcbiAgICAgKiDnrKzkuozmrKHmjqXmlLbliJvlu7ogc3RvcmUg5omA6ZyA6KaB55qEIHJlZHVjZXIg5ZKMIHByZWxvYWRlZFN0YXRlXHJcbiAgICAgKiDkuKTmrKHmjqXmlLblkI7liJvlu7ogc3RvcmVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGNyZWF0ZVN0b3JlID0+ICguLi5hcmdzKSA9PiB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog6K6y5LiA5LiL5Lit6Ze05Lu255qE5qC85byP77yM5Lit6Ze05Lu25piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgICAgICogKHsgZGlzcGF0Y2gsIGdldFN0YXRlIH0pID0+IG5leHQgPT4gYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDnrKzkuIDlsYLmjqXmlLbkuIDkuKrlr7nosaHvvIzph4zpnaLmmK8gZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqIOesrOS6jOWxguaOpeaUtiBuZXh0IOaYr+S4i+S4gOS4quS4remXtOS7tueahOWHveaVsO+8jOWmguaenOaYr+acgOWQjuS4gOS4qiBuZXh0IOWwseaYryBzdG9yZSDnmoQgZGlzcGF0Y2gg5pa55rOVKOS4jeaYr+WQjumdouWjsOaYjueahOmCo+S4qilcclxuICAgICAgICAgKiDnrKzkuInlsYLlsLHmmK/op6blj5EgZGlzcGF0Y2gg55qEIGFjdGlvbiDlkozmiJHku6zkuobop6PnmoQgcmVkdXgg5LiA5qC3XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBjcmVhdGVTdG9yZSguLi5hcmdzKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlhpnkuIDkuKrnqbrnmoQgZGlzcGF0Y2gg5Ye95pWw77yM6L+Z5LiqIGRpc3BhdGNoIOWwhuaYr+eUqOadpemTvuW8j+inpuWPkeS4remXtOS7tueahCBkaXNwYXRjaCDmlrnms5VcclxuICAgICAgICAgKiDov5nkuKogZGlzcGF0Y2gg5LiN5piv55yf5q2jIHN0b3JlIOS4iueahCBkaXNwYXRjaO+8jOiAjOaYr+inpuWPkeaJgOacieS4remXtOS7tueahCBkaXNwYXRjaFxyXG4gICAgICAgICAqIOWjsOaYjiBtaWRkbGV3YXJlQVBJIOmHjOmdouaYr+aJgOacieS4remXtOS7tumDvemcgOimgeeUqOWIsOeahCBnZXRTdGF0ZSDlkowgZGlzcGF0Y2gg5pa55rOVXHJcbiAgICAgICAgICog5Zyo5Lit6Ze05Lu25Lit6LCD55So6L+Z6YeM55qEIGRpc3BhdGNoIOaWueazleWwhuS8mumHjeaWsOi1sOS4gOmBjeaJgOacieS4remXtOS7tlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGxldCBkaXNwYXRjaCA9ICgpID0+IHt9O1xyXG5cclxuICAgICAgICBjb25zdCBtaWRkbGV3YXJlQVBJID0ge1xyXG4gICAgICAgICAgICBnZXRTdGF0ZTogc3RvcmUuZ2V0U3RhdGUsXHJcbiAgICAgICAgICAgIGRpc3BhdGNoOiAoLi4uYXJnKSA9PiBkaXNwYXRjaCguLi5hcmcpXHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDpgY3ljobkvKDlhaXnmoTmiYDmnInkuK3pl7Tku7bvvIzmiafooYzmiYDmnInkuK3pl7Tku7bnmoTnrKzkuIDlsYLlh73mlbDvvIzkvKDlhaUgZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGNoYWluID0gbWlkZGxld2FyZXMubWFwKG1pZGRsZXdhcmUgPT4gbWlkZGxld2FyZShtaWRkbGV3YXJlQVBJKSk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog5oiR5Lus5bCG6L+Z6YOo5YiG5ouG5byA5p2l55yL77yM6aaW5YWIIGNvbXBvc2UoLi4uY2hhaW4pXHJcbiAgICAgICAgICog57uP6L+H6L+Z5LiA5q2l5oiR5Lus5b6X5Yiw55qE5pivICguLi5hcmcpID0+IOS4remXtOS7tjEo5Lit6Ze05Lu2MijkuK3pl7Tku7YzKC4uLmFyZykpKSDov5nmoLfnmoTlh73mlbBcclxuICAgICAgICAgKiBjb21wb3NlKC4uLmNoYWluKShzdG9yZS5kaXNwYXRjaClcclxuICAgICAgICAgKiBhcmcgPSBzdG9yZS5kaXNwYXRjaCDkuK3pl7Tku7Yz55qEIG5leHQg5bCx5pivIHN0b3JlLmRpc3BhdGNoIOWHveaVsO+8jOS4remXtOS7tjPov5Tlm57nmoTlh73mlbAgYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDkuK3pl7Tku7Yy5o6l5pS25Lit6Ze05Lu2M+i/lOWbnueahCBhY3Rpb24gPT4geyAuLi4gfSDkvZzkuLrkuK3pl7Tku7Yy55qEIG5leHQg54S25ZCO6L+U5Zue6Ieq5bex55qEIGFjdGlvbiA9PiB7IC4uLiB9XHJcbiAgICAgICAgICog5pyA5ZCO6L+U5Zue5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDvvIzkuK3pl7Tku7Yx55qEIG5leHQg5piv5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5b2T5oiR5Lus5omn6KGM5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDkuK3op6blj5HkuK3pl7Tku7Yx55qEIG5leHQg5byA5aeL5omn6KGM5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5pyA5ZCO5omn6KGM5Lit6Ze05Lu2M+eahCBuZXh0IO+8jOiwg+eUqOS6hiBzdG9yZS5kaXNwYXRjaCDlh73mlbBcclxuICAgICAgICAgKiDnm7jlvZPkuo7ov5nkuKogZGlzcGF0Y2gg5piv55So5p2l6Kem5Y+R5omA5pyJ5Lit6Ze05Lu255qE77yM5omn6KGM5a6M5omA5pyJ5Lit6Ze05Lu25ZCO77yM5bCG5omn6KGM55yf5q2j55qEIHN0b3JlLmRpc3BhdGNoIOWHveaVsFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGRpc3BhdGNoID0gY29tcG9zZSguLi5jaGFpbikoc3RvcmUuZGlzcGF0Y2gpO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlsIYgc3RvcmUg55qE5YW25LuW5Ye95pWw5LiO57uP6L+H5bCB6KOF55qEIGRpc3BhdGNoIOS4gOWQjOi/lOWbnu+8jOW9ouaIkOaWsOeahOWujOaVtOeahCBzdG9yZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGRpc3BhdGNoLFxyXG4gICAgICAgICAgICAuLi5zdG9yZVxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG59XHJcbiIsIi8qKlxyXG4gKiBiaW5kQWN0aW9uQ3JlYXRvcnMg5a6e546wXHJcbiAqIOWHveaVsOeahOS9nOeUqOaYr+WwhueUn+aIkCBhY3Rpb24g55qE5pa55rOV77yM5LiOIGRpc3BhdGNoIOe7k+WQiOS8oOmAkue7meWtkOWFg+e0oOetiVxyXG4gKiDmjqXmlLbkuKTkuKrlj4LmlbAgYWN0aW9uQ3JlYXRvcnMg5ZKMIGRpc3BhdGNoXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBhY3Rpb25DcmVhdG9ycyDmmK/kuIDkuKrmiJblpJrkuKrnlJ/miJAgYWN0aW9uIOeahOWHveaVsOe7hOaIkOeahCBvYmplY3RcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZGlzcGF0Y2gg55SxIHJlZHV4IOeahCBjcmVhdGVTdG9yZSDnlJ/miJDnmoTop6blj5Hlj5HluIMv6K6i6ZiF55qE5pa55rOVXHJcbiAqXHJcbiAqIEByZXR1cm4ge09iamVjdH0g6L+U5Zue5LiA5Liq5bey57uP5Zyo5q+P5LiA5LiqIGFjdGlvbkNyZWF0b3Ig5LiK57uR5a6a5LqGIGRpc3BhdGNoIOaWueazleeahOWvueixoVxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYmluZEFjdGlvbkNyZWF0b3JzKGFjdGlvbkNyZWF0b3JzLCBkaXNwYXRjaCkge1xyXG4gICAgLyoqXHJcbiAgICAgKiDliJvlu7ogYm91bmRBY3Rpb25DcmVhdG9ycyDkvZzkuLrlsIbopoHov5Tlm57nmoTlr7nosaFcclxuICAgICAqIOmBjeWOhiBhY3Rpb25DcmVhdG9ycyDnmoTmiYDmnInlsZ7mgKfvvIzojrflj5YgYWN0aW9uQ3JlYXRvclxyXG4gICAgICog5YaZ5LiA5Liq5pa55rOV5omn6KGM77yM5o6l5pS26YCa6L+HIGFjdGlvbkNyZWF0b3Ig55Sf5oiQIGFjdGlvbiDmiYDpnIDopoHnmoTlj4LmlbAgYXJnXHJcbiAgICAgKiBkaXNwYXRjaCDlkowgYWN0aW9uQ3JlYXRvciDnlLHkuo7pl63ljIXkuIDnm7TlrZjlnKhcclxuICAgICAqIOiwg+eUqCAoLi4uYXJnKSA9PiBkaXNwYXRjaChhY3Rpb25DcmVhdG9yKC4uLmFyZykpIOaXtlxyXG4gICAgICogYWN0aW9uQ3JlYXRvciguLi5hcmcpIOi/lOWbniBhY3Rpb25cclxuICAgICAqIGRpc3BhdGNoKGFjdGlvbikg6Kem5Y+R5Y+R5biDL+iuoumYhVxyXG4gICAgICovXHJcbiAgICBjb25zdCBib3VuZEFjdGlvbkNyZWF0b3JzID0ge307XHJcbiAgICBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGFjdGlvbkNyZWF0b3IgPSBhY3Rpb25DcmVhdG9yc1tpdGVtXTtcclxuICAgICAgICBib3VuZEFjdGlvbkNyZWF0b3JzW2l0ZW1dID0gKC4uLmFyZykgPT4gZGlzcGF0Y2goYWN0aW9uQ3JlYXRvciguLi5hcmcpKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGJvdW5kQWN0aW9uQ3JlYXRvcnM7XHJcbn1cclxuIiwiLyoqXHJcbiAqIGNvbWJpbmVSZWR1Y2VycyDlrp7njrBcclxuICog5Ye95pWw55qE5L2c55So5piv5bCG5aSa5LiqIHJlZHVjZXIg5oyJ54WnIGtleTogdmFsdWUg57uE5oiQ5LiA5Liq5pu05aSn55qEIHJlZHVjZXJcclxuICog5o6l5pS25LiA5Liq5Y+C5pWwIHJlZHVjZXJzXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSByZWR1Y2VycyDmmK/lsIblpJrkuKogcmVkdWNlciDnu4TlkIjmiJDnmoTlr7nosaFcclxuICpcclxuICogQHJldHVybiB7RnVuY3Rpb259IOi/lOWbnuecn+ato+abv+S7oyByZWR1Y2VyIOeahOWHveaVsFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29tYmluZVJlZHVjZXJzKHJlZHVjZXJzID0ge30pIHtcclxuICAgIC8qKlxyXG4gICAgICogY29tYmluZVJlZHVjZXJzIOWHveaVsOi/lOWbnuS4gOS4qiBmdW5jdGlvblxyXG4gICAgICog6L+Z5Liq5Ye95pWw5piv55yf5q2j55qEIHJlZHVjZXIg5o6l5pS25Lik5Liq5Y+C5pWwXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlIOi/meS4quaYr+aVtOS9k+eahOm7mOiupOeKtuaAgVxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFjdGlvbiDnlKjmnaXop6blj5EgcmVkdWNlciDnmoTlr7nosaHvvIzlv4XmnInlrZfmrrUgYWN0aW9uLnR5cGVcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IOi/lOWbnuWujOaIkOeahCBzdGF0ZVxyXG4gICAgICovXHJcbiAgICByZXR1cm4gZnVuY3Rpb24gY29tYmluYXRpb24oc3RhdGUgPSB7fSwgYWN0aW9uKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog6YGN5Y6GIHJlZHVjZXJzIOeahOaJgOacieWxnuaAp++8jOWPluW+l+aJgOacieeahCByZWR1Y2VyXHJcbiAgICAgICAgICog5Li65q+P5LiqIHJlZHVjZXIg5Lyg5YWl5a+55bqU55qEIHN0YXRlIOWSjCDmiYDop6blj5HnmoQgYWN0aW9uXHJcbiAgICAgICAgICog5bCG5a+55bqU6L+U5Zue55qEIHN0YXRlIOaUvuWFpSBuZXh0U3RhdGUg5LitXHJcbiAgICAgICAgICog6L+U5ZueIG5leHRTdGF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IG5leHRTdGF0ZSA9IHt9O1xyXG4gICAgICAgIE9iamVjdC5rZXlzKHJlZHVjZXJzKS5mb3JFYWNoKChrZXkpID0+IHtcclxuICAgICAgICAgICAgbmV4dFN0YXRlW2tleV0gPSByZWR1Y2Vyc1trZXldKHN0YXRlW2tleV0sIGFjdGlvbik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICAgIH07XHJcbn1cclxuIiwiLyoqXHJcbiAqIHJlYWN0LXV4dW5rXHJcbiAqIOaMieeFpyByZWR1eCDmupDnoIHov5vooYzku7/liLZcclxuICog5Y+R5biDL+iuoumYheaooeW8j1xyXG4gKiDmi6XmnIkgcmVkdXgg55qE5Yeg5LmO5omA5pyJ5Yqf6IO9XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlZHVjZXIg55So5LqO5a2Y5pS+5omA5pyJ55qE5pWw5o2u5aSE55CG6YC76L6R77yM6L+U5Zue5LiL5LiA5Liqc3RhdGXmoJFcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRTdGF0ZSDpu5jorqTnmoTliJ3lp4vljJYgc3RhdGVcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZW5oYW5jZXIg5Li6IHJlZHV4IOaPkOS+m+aJgOacieS4remXtOS7tu+8jOWPquiDveS9v+eUqCdhcHBseU1pZGRsZXdhcmUn5pa55rOV5p2l55Sf5oiQXHJcbiAqXHJcbiAqIEByZXR1cm4ge09iamVjdH0g6L+U5ZueIHN0b3JlIOmHjOmdouWMheWQqyByZWR1eCDmiYDmnInmlbDmja7lj4rmlrnms5VcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZVN0b3JlKHJlZHVjZXIsIGRlZmF1bHRTdGF0ZSwgZW5oYW5jZXIpIHtcclxuICAgIC8vIOWIpOaWreaYr+S4jeaYr+ayoeaciSBkZWZhdWx0U3RhdGUg5Y+q5pyJIGVuaGFuY2VyIOWmguaenOaYr+i/meagt+WwseS6pOaNouS4gOS4i1xyXG4gICAgaWYgKHR5cGVvZiBlbmhhbmNlciA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGRlZmF1bHRTdGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIGVuaGFuY2VyID0gZGVmYXVsdFN0YXRlO1xyXG4gICAgICAgIGRlZmF1bHRTdGF0ZSA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIC8vIOWmguaenOacieS4remXtOS7tuWwseWcqOS4remXtOS7tuS4reaJp+ihjCBjcmVhdGVTdG9yZVxyXG4gICAgaWYgKHR5cGVvZiBlbmhhbmNlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJldHVybiBlbmhhbmNlcihjcmVhdGVTdG9yZSkocmVkdWNlciwgZGVmYXVsdFN0YXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgY3VycmVudFN0YXRlID0gZGVmYXVsdFN0YXRlO1xyXG4gICAgbGV0IGN1cnJlbnRSZWR1Y2VyID0gcmVkdWNlcjtcclxuICAgIGNvbnN0IGN1cnJlbnRMaXN0ZW5lcnMgPSBbXTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGRpc3BhdGNoIOWHveaVsO+8jOaJp+ihjCByZWR1Y2VyIO+8jOinpuWPkeaJgOaciSBsaXN0ZW5lclxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhY3Rpb24g6Kem5Y+R5Y+R5biDL+iuoumYheeahOS6i+S7tlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm4ge09iamVjdH0g5omn6KGM5ZCO6L+U5ZueIGFjdGlvblxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb24pIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlhoXnva4gcmVkdXgtdGh1bmtcclxuICAgICAgICAgKiDliKTmlq3lpoLmnpwgYWN0aW9uIOaYr+S4gOS4qiBmdW5jdGlvbiDlsLHmiafooYzlroNcclxuICAgICAgICAgKi9cclxuICAgICAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBhY3Rpb24oKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdXJyZW50U3RhdGUgPSBjdXJyZW50UmVkdWNlcihjdXJyZW50U3RhdGUsIGFjdGlvbik7XHJcbiAgICAgICAgY3VycmVudExpc3RlbmVycy5mb3JFYWNoKGl0ZW0gPT4gaXRlbSgpKTtcclxuICAgICAgICByZXR1cm4gYWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZ2V0U3RhdGUg5Ye95pWw77yM6L+U5Zue57uP6L+H5rex5YWL6ZqG55qEIHN0YXRlIOagkVxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcclxuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdXJyZW50U3RhdGUpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHN1YnNjcmliZSDlh73mlbDvvIznlKjkuo7nu5Hlrpog6Kem5Y+RIGRpc3BhdGNoIOabtOaWsCBzdGF0ZSDml7bop6blj5HnmoTlh73mlbBcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiDkvKDlhaXpnIDopoHliqDlhaUgbGlzdGVuZXJzIOe7keWumueahOWHveaVsFxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSDop6PpmaTmlLnlh73mlbDnu5HlrprnmoTmlrnms5VcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gc3Vic2NyaWJlKGZuKSB7XHJcbiAgICAgICAgLy8g5aaC5p6cIGZuIOayoeacieaIluS4jeaYr+S4gOS4qiBmdW5jdGlvbiDmipvlh7rplJnor69cclxuICAgICAgICBpZiAoIWZuIHx8IHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcignVGhpcyBmdW5jdGlvbiBoYXMgYmVlbiBzdWJzY3JpYmVkIScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBsaXN0ZW5lcnMg6YeM5rKh5pyJ6L+Z5Liq5pe277yM5Yqg6L+b5Y67XHJcbiAgICAgICAgaWYgKGN1cnJlbnRMaXN0ZW5lcnMuaW5kZXhPZihmbikgPCAwKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRMaXN0ZW5lcnMucHVzaChmbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIOi/lOWbnuino+mZpCBsaXN0ZW5lcnMg57uR5a6a55qE5pa55rOVXHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHVuc3Vic2NyaWJlKCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IGN1cnJlbnRMaXN0ZW5lcnMuaW5kZXhPZihmbik7XHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRMaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXBsYWNlUmVkdWNlciDlh73mlbDvvIzmjqXmlLbkuIDkuKrmlrDnmoQgcmVkdWNlciDku6Pmm7/ml6fnmoRcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXdSZWR1Y2VyIOaWsOeahCByZWR1Y2VyXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHJlcGxhY2VSZWR1Y2VyKG5ld1JlZHVjZXIpIHtcclxuICAgICAgICBjdXJyZW50UmVkdWNlciA9IG5ld1JlZHVjZXI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1YnNjcmliZSxcclxuICAgICAgICBkaXNwYXRjaCxcclxuICAgICAgICBnZXRTdGF0ZSxcclxuICAgICAgICByZXBsYWNlUmVkdWNlclxyXG4gICAgfTtcclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0FBV0EsQUFBZSxTQUFTLE9BQU8sQ0FBQyxHQUFHLEtBQUssRUFBRTs7Ozs7Ozs7O0lBU3RDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzNEOztBQ3BCRDs7Ozs7Ozs7OztBQVVBLEFBQWUsU0FBUyxlQUFlLENBQUMsR0FBRyxXQUFXLEVBQUU7Ozs7Ozs7OztJQVNwRCxPQUFPLFdBQVcsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLOzs7Ozs7OztRQVEvQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzs7Ozs7OztRQU9uQyxJQUFJLFFBQVEsR0FBRyxNQUFNLEVBQUUsQ0FBQzs7UUFFeEIsTUFBTSxhQUFhLEdBQUc7WUFDbEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLFFBQVEsRUFBRSxDQUFDLEdBQUcsR0FBRyxLQUFLLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQztTQUN6QyxDQUFDOzs7O1FBSUYsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Ozs7Ozs7Ozs7OztRQVl2RSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsS0FB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
