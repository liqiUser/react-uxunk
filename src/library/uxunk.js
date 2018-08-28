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
        return Object.assign({}, store, { dispatch });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXh1bmsuanMiLCJzb3VyY2VzIjpbInNyYy9jb21wb3NlLmpzIiwic3JjL2FwcGx5TWlkZGxld2FyZS5qcyIsInNyYy9iaW5kQWN0aW9uQ3JlYXRvcnMuanMiLCJzcmMvY29tYmluZVJlZHVjZXJzLmpzIiwic3JjL2NyZWF0ZVN0b3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBjb21wb3NlIOWunueOsFxyXG4gKiDlh73mlbDkvZznlKjmmK/lsIblpJrkuKrlh73mlbDpgJrov4flh73mlbDlvI/nvJbnqIvnmoTmlrnlvI/nu4TlkIjotbfmnaVcclxuICog57uE5ZCI5oiQ5LiA5Liq5Y+v5Lul6ZO+5byP6LCD55So55qE5Ye95pWw5bm26L+U5Zue5a6DXHJcbiAqIOaJp+ihjOi/lOWbnueahOWHveaVsOWwhuS7jiBmdW5jIOeahOacgOWQjuS4gOS4quWHveaVsOW8gOWni+iwg+eUqFxyXG4gKiDlgJLmlbDnrKzkuozkuKrlh73mlbDku6XmnIDlkI7kuIDkuKrlh73mlbDnmoTov5Tlm57lgLzkuLrlj4LmlbDlvIDlp4vmiafooYzvvIzku6XmraTmnaXmjqguLi5cclxuICpcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gZnVuY3Mg5bCG5omA5pyJ5Lyg5YWl55qE5Y+C5pWw5ZCI5oiQ5LiA5Liq5pWw57uE77yM5q+P5LiA5Liq5Y+C5pWw6YO95piv5LiA5LiqIGZ1bmN0aW9uXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrnu4/ov4cgcmVkdWNlIOe7hOWQiOWQjueahOWHveaVsO+8jOexu+S8vOS6jiBhKGIoYyhkKC4uLmFyZykpKSlcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBvc2UoLi4uZnVuY3MpIHtcclxuICAgIC8qKlxyXG4gICAgICog5bCGIGZ1bmMg6YCa6L+HIHJlZHVjZSDnu4TlkIjotbfmnaVcclxuICAgICAqIOS+i+WmgiBmdW5jID0gW2EsIGIsIGNdXHJcbiAgICAgKiDnrKzkuIDmrKHnu4/ov4cgcmVkdWNlIOi/lOWbnue7k+aenCAoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSlcclxuICAgICAqIOesrOS6jOasoee7j+i/hyByZWR1Y2Ug6L+U5Zue57uT5p6cICguLi5hcmcpID0+ICgoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSkpKGMoLi4uYXJnKSlcclxuICAgICAqIOetieS6jiAoLi4uYXJnKSA9PiBhKGIoYyguLi5hcmcpKSlcclxuICAgICAqIOW9k+aIkeS7rOaJp+ihjOi/meS4que7k+aenOaXtuWFiOaJp+ihjCBjIOeEtuWQjuS7pSBjIOeahOe7k+aenOaJp+ihjCBiLi4uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jcy5yZWR1Y2UoKGEsIGIpID0+ICguLi5hcmcpID0+IGEoYiguLi5hcmcpKSk7XHJcbn1cclxuIiwiaW1wb3J0IGNvbXBvc2UgZnJvbSAnLi9jb21wb3NlJztcclxuLyoqXHJcbiAqIGFwcGx5TWlkZGxld2FyZSDlrp7njrBcclxuICog5Ye95pWw55qE5L2c55So5piv5bCG5L2g5ZyoIHJlZHV4IOS4reeUqOWIsOeahOaJgOacieS4remXtOS7tue7hOWQiOi1t+adpVxyXG4gKiDnrYnlvoXop6blj5EgZGlzcGF0Y2gg5pe25L6d5qyh6Kem5Y+R5omA5pyJ5Lit6Ze05Lu2XHJcbiAqIOaOpeaUtuS4gOS4quWPguaVsCBtaWRkbGV3YXJlcyDkuK3pl7Tku7bku6xcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gbWlkZGxld2FyZXMg5omA5pyJ5Lit6Ze05Lu26YO95piv5Ye95pWwXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrlj6/ku6XmjqXmlLYgY3JlYXRlU3RvcmUg55qE5Ye95pWwXHJcbiAqIOWcqOS9v+eUqOi/meS4quWHveaVsOeahOaDheWGteS4iyBzdG9yZSDnmoTliJvlu7rlsIblnKjov5nkuKrlh73mlbDkuK3ov5vooYxcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFwcGx5TWlkZGxld2FyZSguLi5taWRkbGV3YXJlcykge1xyXG4gICAgLyoqXHJcbiAgICAgKiDphY3lkIggY3JlYXRlU3RvcmUg5Lit55qEIGVuaGFuY2VyIOadpeWunueOsOacieS4remXtOS7tueahCBzdG9yZSDnmoTliJvlu7pcclxuICAgICAqIOacieS4remXtOS7tueahCBzdG9yZSDkvJrlnKjop6blj5EgZGlzcGF0Y2gg5ZCO77yM5omn6KGMIHJlZHVjZXIg5YmN5omn6KGM5omA5pyJ55qE5Lit6Ze05Lu2XHJcbiAgICAgKiBhcHBseU1pZGRsZXdhcmUg6L+U5Zue55qE5piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgKiDnrKzkuIDmrKHmjqXmlLYgcmVkdXgg55qEIGNyZWF0ZVN0b3JlXHJcbiAgICAgKiDnrKzkuozmrKHmjqXmlLbliJvlu7ogc3RvcmUg5omA6ZyA6KaB55qEIHJlZHVjZXIg5ZKMIHByZWxvYWRlZFN0YXRlXHJcbiAgICAgKiDkuKTmrKHmjqXmlLblkI7liJvlu7ogc3RvcmVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGNyZWF0ZVN0b3JlID0+ICguLi5hcmdzKSA9PiB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog6K6y5LiA5LiL5Lit6Ze05Lu255qE5qC85byP77yM5Lit6Ze05Lu25piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgICAgICogKHsgZGlzcGF0Y2gsIGdldFN0YXRlIH0pID0+IG5leHQgPT4gYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDnrKzkuIDlsYLmjqXmlLbkuIDkuKrlr7nosaHvvIzph4zpnaLmmK8gZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqIOesrOS6jOWxguaOpeaUtiBuZXh0IOaYr+S4i+S4gOS4quS4remXtOS7tueahOWHveaVsO+8jOWmguaenOaYr+acgOWQjuS4gOS4qiBuZXh0IOWwseaYryBzdG9yZSDnmoQgZGlzcGF0Y2gg5pa55rOVKOS4jeaYr+WQjumdouWjsOaYjueahOmCo+S4qilcclxuICAgICAgICAgKiDnrKzkuInlsYLlsLHmmK/op6blj5EgZGlzcGF0Y2gg55qEIGFjdGlvbiDlkozmiJHku6zkuobop6PnmoQgcmVkdXgg5LiA5qC3XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBjcmVhdGVTdG9yZSguLi5hcmdzKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlhpnkuIDkuKrnqbrnmoQgZGlzcGF0Y2gg5Ye95pWw77yM6L+Z5LiqIGRpc3BhdGNoIOWwhuaYr+eUqOadpemTvuW8j+inpuWPkeS4remXtOS7tueahCBkaXNwYXRjaCDmlrnms5VcclxuICAgICAgICAgKiDov5nkuKogZGlzcGF0Y2gg5LiN5piv55yf5q2jIHN0b3JlIOS4iueahCBkaXNwYXRjaO+8jOiAjOaYr+inpuWPkeaJgOacieS4remXtOS7tueahCBkaXNwYXRjaFxyXG4gICAgICAgICAqIOWjsOaYjiBtaWRkbGV3YXJlQVBJIOmHjOmdouaYr+aJgOacieS4remXtOS7tumDvemcgOimgeeUqOWIsOeahCBnZXRTdGF0ZSDlkowgZGlzcGF0Y2gg5pa55rOVXHJcbiAgICAgICAgICog5Zyo5Lit6Ze05Lu25Lit6LCD55So6L+Z6YeM55qEIGRpc3BhdGNoIOaWueazleWwhuS8mumHjeaWsOi1sOS4gOmBjeaJgOacieS4remXtOS7tlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGxldCBkaXNwYXRjaCA9ICgpID0+IHt9O1xyXG5cclxuICAgICAgICBjb25zdCBtaWRkbGV3YXJlQVBJID0ge1xyXG4gICAgICAgICAgICBnZXRTdGF0ZTogc3RvcmUuZ2V0U3RhdGUsXHJcbiAgICAgICAgICAgIGRpc3BhdGNoOiAoLi4uYXJnKSA9PiBkaXNwYXRjaCguLi5hcmcpXHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDpgY3ljobkvKDlhaXnmoTmiYDmnInkuK3pl7Tku7bvvIzmiafooYzmiYDmnInkuK3pl7Tku7bnmoTnrKzkuIDlsYLlh73mlbDvvIzkvKDlhaUgZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGNoYWluID0gbWlkZGxld2FyZXMubWFwKG1pZGRsZXdhcmUgPT4gbWlkZGxld2FyZShtaWRkbGV3YXJlQVBJKSk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog5oiR5Lus5bCG6L+Z6YOo5YiG5ouG5byA5p2l55yL77yM6aaW5YWIIGNvbXBvc2UoLi4uY2hhaW4pXHJcbiAgICAgICAgICog57uP6L+H6L+Z5LiA5q2l5oiR5Lus5b6X5Yiw55qE5pivICguLi5hcmcpID0+IOS4remXtOS7tjEo5Lit6Ze05Lu2MijkuK3pl7Tku7YzKC4uLmFyZykpKSDov5nmoLfnmoTlh73mlbBcclxuICAgICAgICAgKiBjb21wb3NlKC4uLmNoYWluKShzdG9yZS5kaXNwYXRjaClcclxuICAgICAgICAgKiBhcmcgPSBzdG9yZS5kaXNwYXRjaCDkuK3pl7Tku7Yz55qEIG5leHQg5bCx5pivIHN0b3JlLmRpc3BhdGNoIOWHveaVsO+8jOS4remXtOS7tjPov5Tlm57nmoTlh73mlbAgYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDkuK3pl7Tku7Yy5o6l5pS25Lit6Ze05Lu2M+i/lOWbnueahCBhY3Rpb24gPT4geyAuLi4gfSDkvZzkuLrkuK3pl7Tku7Yy55qEIG5leHQg54S25ZCO6L+U5Zue6Ieq5bex55qEIGFjdGlvbiA9PiB7IC4uLiB9XHJcbiAgICAgICAgICog5pyA5ZCO6L+U5Zue5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDvvIzkuK3pl7Tku7Yx55qEIG5leHQg5piv5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5b2T5oiR5Lus5omn6KGM5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDkuK3op6blj5HkuK3pl7Tku7Yx55qEIG5leHQg5byA5aeL5omn6KGM5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5pyA5ZCO5omn6KGM5Lit6Ze05Lu2M+eahCBuZXh0IO+8jOiwg+eUqOS6hiBzdG9yZS5kaXNwYXRjaCDlh73mlbBcclxuICAgICAgICAgKiDnm7jlvZPkuo7ov5nkuKogZGlzcGF0Y2gg5piv55So5p2l6Kem5Y+R5omA5pyJ5Lit6Ze05Lu255qE77yM5omn6KGM5a6M5omA5pyJ5Lit6Ze05Lu25ZCO77yM5bCG5omn6KGM55yf5q2j55qEIHN0b3JlLmRpc3BhdGNoIOWHveaVsFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGRpc3BhdGNoID0gY29tcG9zZSguLi5jaGFpbikoc3RvcmUuZGlzcGF0Y2gpO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlsIYgc3RvcmUg55qE5YW25LuW5Ye95pWw5LiO57uP6L+H5bCB6KOF55qEIGRpc3BhdGNoIOS4gOWQjOi/lOWbnu+8jOW9ouaIkOaWsOeahOWujOaVtOeahCBzdG9yZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdG9yZSwgeyBkaXNwYXRjaCB9KTtcclxuICAgIH07XHJcbn1cclxuIiwiLyoqXHJcbiAqIGJpbmRBY3Rpb25DcmVhdG9ycyDlrp7njrBcclxuICog5Ye95pWw55qE5L2c55So5piv5bCG55Sf5oiQIGFjdGlvbiDnmoTmlrnms5XvvIzkuI4gZGlzcGF0Y2gg57uT5ZCI5Lyg6YCS57uZ5a2Q5YWD57Sg562JXHJcbiAqIOaOpeaUtuS4pOS4quWPguaVsCBhY3Rpb25DcmVhdG9ycyDlkowgZGlzcGF0Y2hcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGFjdGlvbkNyZWF0b3JzIOaYr+S4gOS4quaIluWkmuS4queUn+aIkCBhY3Rpb24g55qE5Ye95pWw57uE5oiQ55qEIG9iamVjdFxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBkaXNwYXRjaCDnlLEgcmVkdXgg55qEIGNyZWF0ZVN0b3JlIOeUn+aIkOeahOinpuWPkeWPkeW4gy/orqLpmIXnmoTmlrnms5VcclxuICpcclxuICogQHJldHVybiB7T2JqZWN0fSDov5Tlm57kuIDkuKrlt7Lnu4/lnKjmr4/kuIDkuKogYWN0aW9uQ3JlYXRvciDkuIrnu5HlrprkuoYgZGlzcGF0Y2gg5pa55rOV55qE5a+56LGhXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBiaW5kQWN0aW9uQ3JlYXRvcnMoYWN0aW9uQ3JlYXRvcnMsIGRpc3BhdGNoKSB7XHJcbiAgICAvKipcclxuICAgICAqIOWIm+W7uiBib3VuZEFjdGlvbkNyZWF0b3JzIOS9nOS4uuWwhuimgei/lOWbnueahOWvueixoVxyXG4gICAgICog6YGN5Y6GIGFjdGlvbkNyZWF0b3JzIOeahOaJgOacieWxnuaAp++8jOiOt+WPliBhY3Rpb25DcmVhdG9yXHJcbiAgICAgKiDlhpnkuIDkuKrmlrnms5XmiafooYzvvIzmjqXmlLbpgJrov4cgYWN0aW9uQ3JlYXRvciDnlJ/miJAgYWN0aW9uIOaJgOmcgOimgeeahOWPguaVsCBhcmdcclxuICAgICAqIGRpc3BhdGNoIOWSjCBhY3Rpb25DcmVhdG9yIOeUseS6jumXreWMheS4gOebtOWtmOWcqFxyXG4gICAgICog6LCD55SoICguLi5hcmcpID0+IGRpc3BhdGNoKGFjdGlvbkNyZWF0b3IoLi4uYXJnKSkg5pe2XHJcbiAgICAgKiBhY3Rpb25DcmVhdG9yKC4uLmFyZykg6L+U5ZueIGFjdGlvblxyXG4gICAgICogZGlzcGF0Y2goYWN0aW9uKSDop6blj5Hlj5HluIMv6K6i6ZiFXHJcbiAgICAgKi9cclxuICAgIGNvbnN0IGJvdW5kQWN0aW9uQ3JlYXRvcnMgPSB7fTtcclxuICAgIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKS5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgY29uc3QgYWN0aW9uQ3JlYXRvciA9IGFjdGlvbkNyZWF0b3JzW2l0ZW1dO1xyXG4gICAgICAgIGJvdW5kQWN0aW9uQ3JlYXRvcnNbaXRlbV0gPSAoLi4uYXJnKSA9PiBkaXNwYXRjaChhY3Rpb25DcmVhdG9yKC4uLmFyZykpO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gYm91bmRBY3Rpb25DcmVhdG9ycztcclxufVxyXG4iLCIvKipcclxuICogY29tYmluZVJlZHVjZXJzIOWunueOsFxyXG4gKiDlh73mlbDnmoTkvZznlKjmmK/lsIblpJrkuKogcmVkdWNlciDmjInnhacga2V5OiB2YWx1ZSDnu4TmiJDkuIDkuKrmm7TlpKfnmoQgcmVkdWNlclxyXG4gKiDmjqXmlLbkuIDkuKrlj4LmlbAgcmVkdWNlcnNcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHJlZHVjZXJzIOaYr+WwhuWkmuS4qiByZWR1Y2VyIOe7hOWQiOaIkOeahOWvueixoVxyXG4gKlxyXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0g6L+U5Zue55yf5q2j5pu/5LujIHJlZHVjZXIg55qE5Ye95pWwXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb21iaW5lUmVkdWNlcnMocmVkdWNlcnMgPSB7fSkge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjb21iaW5lUmVkdWNlcnMg5Ye95pWw6L+U5Zue5LiA5LiqIGZ1bmN0aW9uXHJcbiAgICAgKiDov5nkuKrlh73mlbDmmK/nnJ/mraPnmoQgcmVkdWNlciDmjqXmlLbkuKTkuKrlj4LmlbBcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdGUg6L+Z5Liq5piv5pW05L2T55qE6buY6K6k54q25oCBXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYWN0aW9uIOeUqOadpeinpuWPkSByZWR1Y2VyIOeahOWvueixoe+8jOW/heacieWtl+autSBhY3Rpb24udHlwZVxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm4ge09iamVjdH0g6L+U5Zue5a6M5oiQ55qEIHN0YXRlXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jdGlvbiBjb21iaW5hdGlvbihzdGF0ZSA9IHt9LCBhY3Rpb24pIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDpgY3ljoYgcmVkdWNlcnMg55qE5omA5pyJ5bGe5oCn77yM5Y+W5b6X5omA5pyJ55qEIHJlZHVjZXJcclxuICAgICAgICAgKiDkuLrmr4/kuKogcmVkdWNlciDkvKDlhaXlr7nlupTnmoQgc3RhdGUg5ZKMIOaJgOinpuWPkeeahCBhY3Rpb25cclxuICAgICAgICAgKiDlsIblr7nlupTov5Tlm57nmoQgc3RhdGUg5pS+5YWlIG5leHRTdGF0ZSDkuK1cclxuICAgICAgICAgKiDov5Tlm54gbmV4dFN0YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3QgbmV4dFN0YXRlID0ge307XHJcbiAgICAgICAgT2JqZWN0LmtleXMocmVkdWNlcnMpLmZvckVhY2goKGtleSkgPT4ge1xyXG4gICAgICAgICAgICBuZXh0U3RhdGVba2V5XSA9IHJlZHVjZXJzW2tleV0oc3RhdGVba2V5XSwgYWN0aW9uKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gICAgfTtcclxufVxyXG4iLCIvKipcclxuICogdXh1bmtcclxuICog5oyJ54WnIHJlZHV4IOa6kOeggei/m+ihjOS7v+WItlxyXG4gKiDlj5HluIMv6K6i6ZiF5qih5byPXHJcbiAqIOaLpeaciSByZWR1eCDnmoTlh6DkuY7miYDmnInlip/og71cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVkdWNlciDnlKjkuo7lrZjmlL7miYDmnInnmoTmlbDmja7lpITnkIbpgLvovpHvvIzov5Tlm57kuIvkuIDkuKpzdGF0ZeagkVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmYXVsdFN0YXRlIOm7mOiupOeahOWIneWni+WMliBzdGF0ZVxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlbmhhbmNlciDkuLogcmVkdXgg5o+Q5L6b5omA5pyJ5Lit6Ze05Lu277yM5Y+q6IO95L2/55SoJ2FwcGx5TWlkZGxld2FyZSfmlrnms5XmnaXnlJ/miJBcclxuICpcclxuICogQHJldHVybiB7T2JqZWN0fSDov5Tlm54gc3RvcmUg6YeM6Z2i5YyF5ZCrIHJlZHV4IOaJgOacieaVsOaNruWPiuaWueazlVxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlU3RvcmUocmVkdWNlciwgZGVmYXVsdFN0YXRlLCBlbmhhbmNlcikge1xyXG4gICAgLy8g5Yik5pat5piv5LiN5piv5rKh5pyJIGRlZmF1bHRTdGF0ZSDlj6rmnIkgZW5oYW5jZXIg5aaC5p6c5piv6L+Z5qC35bCx5Lqk5o2i5LiA5LiLXHJcbiAgICBpZiAodHlwZW9mIGVuaGFuY2VyID09PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZGVmYXVsdFN0YXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgZW5oYW5jZXIgPSBkZWZhdWx0U3RhdGU7XHJcbiAgICAgICAgZGVmYXVsdFN0YXRlID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgLy8g5aaC5p6c5pyJ5Lit6Ze05Lu25bCx5Zyo5Lit6Ze05Lu25Lit5omn6KGMIGNyZWF0ZVN0b3JlXHJcbiAgICBpZiAodHlwZW9mIGVuaGFuY2VyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgcmV0dXJuIGVuaGFuY2VyKGNyZWF0ZVN0b3JlKShyZWR1Y2VyLCBkZWZhdWx0U3RhdGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjdXJyZW50U3RhdGUgPSBkZWZhdWx0U3RhdGU7XHJcbiAgICBsZXQgY3VycmVudFJlZHVjZXIgPSByZWR1Y2VyO1xyXG4gICAgY29uc3QgY3VycmVudExpc3RlbmVycyA9IFtdO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogZGlzcGF0Y2gg5Ye95pWw77yM5omn6KGMIHJlZHVjZXIg77yM6Kem5Y+R5omA5pyJIGxpc3RlbmVyXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFjdGlvbiDop6blj5Hlj5HluIMv6K6i6ZiF55qE5LqL5Lu2XHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybiB7T2JqZWN0fSDmiafooYzlkI7ov5Tlm54gYWN0aW9uXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGRpc3BhdGNoKGFjdGlvbikge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIOWGhee9riByZWR1eC10aHVua1xyXG4gICAgICAgICAqIOWIpOaWreWmguaenCBhY3Rpb24g5piv5LiA5LiqIGZ1bmN0aW9uIOWwseaJp+ihjOWug1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGlmICh0eXBlb2YgYWN0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbigpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRTdGF0ZSA9IGN1cnJlbnRSZWR1Y2VyKGN1cnJlbnRTdGF0ZSwgYWN0aW9uKTtcclxuICAgICAgICBjdXJyZW50TGlzdGVuZXJzLmZvckVhY2goaXRlbSA9PiBpdGVtKCkpO1xyXG4gICAgICAgIHJldHVybiBhY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBnZXRTdGF0ZSDlh73mlbDvvIzov5Tlm57nu4/ov4fmt7HlhYvpmobnmoQgc3RhdGUg5qCRXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdldFN0YXRlKCkge1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN1cnJlbnRTdGF0ZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogc3Vic2NyaWJlIOWHveaVsO+8jOeUqOS6jue7keWumiDop6blj5EgZGlzcGF0Y2gg5pu05pawIHN0YXRlIOaXtuinpuWPkeeahOWHveaVsFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIOS8oOWFpemcgOimgeWKoOWFpSBsaXN0ZW5lcnMg57uR5a6a55qE5Ye95pWwXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259IOino+mZpOaUueWHveaVsOe7keWumueahOaWueazlVxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBzdWJzY3JpYmUoZm4pIHtcclxuICAgICAgICAvLyDlpoLmnpwgZm4g5rKh5pyJ5oiW5LiN5piv5LiA5LiqIGZ1bmN0aW9uIOaKm+WHuumUmeivr1xyXG4gICAgICAgIGlmICghZm4gfHwgdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdUaGlzIGZ1bmN0aW9uIGhhcyBiZWVuIHN1YnNjcmliZWQhJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGxpc3RlbmVycyDph4zmsqHmnInov5nkuKrml7bvvIzliqDov5vljrtcclxuICAgICAgICBpZiAoY3VycmVudExpc3RlbmVycy5pbmRleE9mKGZuKSA8IDApIHtcclxuICAgICAgICAgICAgY3VycmVudExpc3RlbmVycy5wdXNoKGZuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8g6L+U5Zue6Kej6ZmkIGxpc3RlbmVycyDnu5HlrprnmoTmlrnms5VcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gdW5zdWJzY3JpYmUoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gY3VycmVudExpc3RlbmVycy5pbmRleE9mKGZuKTtcclxuICAgICAgICAgICAgaWYgKGluZGV4ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudExpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlcGxhY2VSZWR1Y2VyIOWHveaVsO+8jOaOpeaUtuS4gOS4quaWsOeahCByZWR1Y2VyIOS7o+abv+aXp+eahFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG5ld1JlZHVjZXIg5paw55qEIHJlZHVjZXJcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcmVwbGFjZVJlZHVjZXIobmV3UmVkdWNlcikge1xyXG4gICAgICAgIGN1cnJlbnRSZWR1Y2VyID0gbmV3UmVkdWNlcjtcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgc3Vic2NyaWJlLFxyXG4gICAgICAgIGRpc3BhdGNoLFxyXG4gICAgICAgIGdldFN0YXRlLFxyXG4gICAgICAgIHJlcGxhY2VSZWR1Y2VyXHJcbiAgICB9O1xyXG59XHJcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7QUFXQSxBQUFlLFNBQVMsT0FBTyxDQUFDLEdBQUcsS0FBSyxFQUFFOzs7Ozs7Ozs7SUFTdEMsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDM0Q7O0FDcEJEOzs7Ozs7Ozs7O0FBVUEsQUFBZSxTQUFTLGVBQWUsQ0FBQyxHQUFHLFdBQVcsRUFBRTs7Ozs7Ozs7O0lBU3BELE9BQU8sV0FBVyxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUs7Ozs7Ozs7O1FBUS9CLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDOzs7Ozs7O1FBT25DLElBQUksUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDOztRQUV4QixNQUFNLGFBQWEsR0FBRztZQUNsQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7WUFDeEIsUUFBUSxFQUFFLENBQUMsR0FBRyxHQUFHLEtBQUssUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDO1NBQ3pDLENBQUM7Ozs7UUFJRixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7O1FBWXZFLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7Ozs7O1FBSzdD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
