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
        return Object.assign({ dispatch }, store);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXh1bmsuanMiLCJzb3VyY2VzIjpbInNyYy9jb21wb3NlLmpzIiwic3JjL2FwcGx5TWlkZGxld2FyZS5qcyIsInNyYy9iaW5kQWN0aW9uQ3JlYXRvcnMuanMiLCJzcmMvY29tYmluZVJlZHVjZXJzLmpzIiwic3JjL2NyZWF0ZVN0b3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBjb21wb3NlIOWunueOsFxyXG4gKiDlh73mlbDkvZznlKjmmK/lsIblpJrkuKrlh73mlbDpgJrov4flh73mlbDlvI/nvJbnqIvnmoTmlrnlvI/nu4TlkIjotbfmnaVcclxuICog57uE5ZCI5oiQ5LiA5Liq5Y+v5Lul6ZO+5byP6LCD55So55qE5Ye95pWw5bm26L+U5Zue5a6DXHJcbiAqIOaJp+ihjOi/lOWbnueahOWHveaVsOWwhuS7jiBmdW5jIOeahOacgOWQjuS4gOS4quWHveaVsOW8gOWni+iwg+eUqFxyXG4gKiDlgJLmlbDnrKzkuozkuKrlh73mlbDku6XmnIDlkI7kuIDkuKrlh73mlbDnmoTov5Tlm57lgLzkuLrlj4LmlbDlvIDlp4vmiafooYzvvIzku6XmraTmnaXmjqguLi5cclxuICpcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gZnVuY3Mg5bCG5omA5pyJ5Lyg5YWl55qE5Y+C5pWw5ZCI5oiQ5LiA5Liq5pWw57uE77yM5q+P5LiA5Liq5Y+C5pWw6YO95piv5LiA5LiqIGZ1bmN0aW9uXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrnu4/ov4cgcmVkdWNlIOe7hOWQiOWQjueahOWHveaVsO+8jOexu+S8vOS6jiBhKGIoYyhkKC4uLmFyZykpKSlcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbXBvc2UoLi4uZnVuY3MpIHtcclxuICAgIC8qKlxyXG4gICAgICog5bCGIGZ1bmMg6YCa6L+HIHJlZHVjZSDnu4TlkIjotbfmnaVcclxuICAgICAqIOS+i+WmgiBmdW5jID0gW2EsIGIsIGNdXHJcbiAgICAgKiDnrKzkuIDmrKHnu4/ov4cgcmVkdWNlIOi/lOWbnue7k+aenCAoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSlcclxuICAgICAqIOesrOS6jOasoee7j+i/hyByZWR1Y2Ug6L+U5Zue57uT5p6cICguLi5hcmcpID0+ICgoLi4uYXJnKSA9PiBhKGIoLi4uYXJnKSkpKGMoLi4uYXJnKSlcclxuICAgICAqIOetieS6jiAoLi4uYXJnKSA9PiBhKGIoYyguLi5hcmcpKSlcclxuICAgICAqIOW9k+aIkeS7rOaJp+ihjOi/meS4que7k+aenOaXtuWFiOaJp+ihjCBjIOeEtuWQjuS7pSBjIOeahOe7k+aenOaJp+ihjCBiLi4uXHJcbiAgICAgKi9cclxuICAgIHJldHVybiBmdW5jcy5yZWR1Y2UoKGEsIGIpID0+ICguLi5hcmcpID0+IGEoYiguLi5hcmcpKSk7XHJcbn1cclxuIiwiaW1wb3J0IGNvbXBvc2UgZnJvbSAnLi9jb21wb3NlJztcclxuLyoqXHJcbiAqIGFwcGx5TWlkZGxld2FyZSDlrp7njrBcclxuICog5Ye95pWw55qE5L2c55So5piv5bCG5L2g5ZyoIHJlZHV4IOS4reeUqOWIsOeahOaJgOacieS4remXtOS7tue7hOWQiOi1t+adpVxyXG4gKiDnrYnlvoXop6blj5EgZGlzcGF0Y2gg5pe25L6d5qyh6Kem5Y+R5omA5pyJ5Lit6Ze05Lu2XHJcbiAqIOaOpeaUtuS4gOS4quWPguaVsCBtaWRkbGV3YXJlcyDkuK3pl7Tku7bku6xcclxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gbWlkZGxld2FyZXMg5omA5pyJ5Lit6Ze05Lu26YO95piv5Ye95pWwXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57kuIDkuKrlj6/ku6XmjqXmlLYgY3JlYXRlU3RvcmUg55qE5Ye95pWwXHJcbiAqIOWcqOS9v+eUqOi/meS4quWHveaVsOeahOaDheWGteS4iyBzdG9yZSDnmoTliJvlu7rlsIblnKjov5nkuKrlh73mlbDkuK3ov5vooYxcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFwcGx5TWlkZGxld2FyZSguLi5taWRkbGV3YXJlcykge1xyXG4gICAgLyoqXHJcbiAgICAgKiDphY3lkIggY3JlYXRlU3RvcmUg5Lit55qEIGVuaGFuY2VyIOadpeWunueOsOacieS4remXtOS7tueahCBzdG9yZSDnmoTliJvlu7pcclxuICAgICAqIOacieS4remXtOS7tueahCBzdG9yZSDkvJrlnKjop6blj5EgZGlzcGF0Y2gg5ZCO77yM5omn6KGMIHJlZHVjZXIg5YmN5omn6KGM5omA5pyJ55qE5Lit6Ze05Lu2XHJcbiAgICAgKiBhcHBseU1pZGRsZXdhcmUg6L+U5Zue55qE5piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgKiDnrKzkuIDmrKHmjqXmlLYgcmVkdXgg55qEIGNyZWF0ZVN0b3JlXHJcbiAgICAgKiDnrKzkuozmrKHmjqXmlLbliJvlu7ogc3RvcmUg5omA6ZyA6KaB55qEIHJlZHVjZXIg5ZKMIHByZWxvYWRlZFN0YXRlXHJcbiAgICAgKiDkuKTmrKHmjqXmlLblkI7liJvlu7ogc3RvcmVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGNyZWF0ZVN0b3JlID0+ICguLi5hcmdzKSA9PiB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog6K6y5LiA5LiL5Lit6Ze05Lu255qE5qC85byP77yM5Lit6Ze05Lu25piv5LiA5Liq5p+v6YeM5YyW55qE5Ye95pWwXHJcbiAgICAgICAgICogKHsgZGlzcGF0Y2gsIGdldFN0YXRlIH0pID0+IG5leHQgPT4gYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDnrKzkuIDlsYLmjqXmlLbkuIDkuKrlr7nosaHvvIzph4zpnaLmmK8gZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqIOesrOS6jOWxguaOpeaUtiBuZXh0IOaYr+S4i+S4gOS4quS4remXtOS7tueahOWHveaVsO+8jOWmguaenOaYr+acgOWQjuS4gOS4qiBuZXh0IOWwseaYryBzdG9yZSDnmoQgZGlzcGF0Y2gg5pa55rOVKOS4jeaYr+WQjumdouWjsOaYjueahOmCo+S4qilcclxuICAgICAgICAgKiDnrKzkuInlsYLlsLHmmK/op6blj5EgZGlzcGF0Y2gg55qEIGFjdGlvbiDlkozmiJHku6zkuobop6PnmoQgcmVkdXgg5LiA5qC3XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBjcmVhdGVTdG9yZSguLi5hcmdzKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlhpnkuIDkuKrnqbrnmoQgZGlzcGF0Y2gg5Ye95pWw77yM6L+Z5LiqIGRpc3BhdGNoIOWwhuaYr+eUqOadpemTvuW8j+inpuWPkeS4remXtOS7tueahCBkaXNwYXRjaCDmlrnms5VcclxuICAgICAgICAgKiDov5nkuKogZGlzcGF0Y2gg5LiN5piv55yf5q2jIHN0b3JlIOS4iueahCBkaXNwYXRjaO+8jOiAjOaYr+inpuWPkeaJgOacieS4remXtOS7tueahCBkaXNwYXRjaFxyXG4gICAgICAgICAqIOWjsOaYjiBtaWRkbGV3YXJlQVBJIOmHjOmdouaYr+aJgOacieS4remXtOS7tumDvemcgOimgeeUqOWIsOeahCBnZXRTdGF0ZSDlkowgZGlzcGF0Y2gg5pa55rOVXHJcbiAgICAgICAgICog5Zyo5Lit6Ze05Lu25Lit6LCD55So6L+Z6YeM55qEIGRpc3BhdGNoIOaWueazleWwhuS8mumHjeaWsOi1sOS4gOmBjeaJgOacieS4remXtOS7tlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGxldCBkaXNwYXRjaCA9ICgpID0+IHt9O1xyXG5cclxuICAgICAgICBjb25zdCBtaWRkbGV3YXJlQVBJID0ge1xyXG4gICAgICAgICAgICBnZXRTdGF0ZTogc3RvcmUuZ2V0U3RhdGUsXHJcbiAgICAgICAgICAgIGRpc3BhdGNoOiAoLi4uYXJnKSA9PiBkaXNwYXRjaCguLi5hcmcpXHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDpgY3ljobkvKDlhaXnmoTmiYDmnInkuK3pl7Tku7bvvIzmiafooYzmiYDmnInkuK3pl7Tku7bnmoTnrKzkuIDlsYLlh73mlbDvvIzkvKDlhaUgZ2V0U3RhdGUg5ZKMIGRpc3BhdGNoIOaWueazlVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGNoYWluID0gbWlkZGxld2FyZXMubWFwKG1pZGRsZXdhcmUgPT4gbWlkZGxld2FyZShtaWRkbGV3YXJlQVBJKSk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog5oiR5Lus5bCG6L+Z6YOo5YiG5ouG5byA5p2l55yL77yM6aaW5YWIIGNvbXBvc2UoLi4uY2hhaW4pXHJcbiAgICAgICAgICog57uP6L+H6L+Z5LiA5q2l5oiR5Lus5b6X5Yiw55qE5pivICguLi5hcmcpID0+IOS4remXtOS7tjEo5Lit6Ze05Lu2MijkuK3pl7Tku7YzKC4uLmFyZykpKSDov5nmoLfnmoTlh73mlbBcclxuICAgICAgICAgKiBjb21wb3NlKC4uLmNoYWluKShzdG9yZS5kaXNwYXRjaClcclxuICAgICAgICAgKiBhcmcgPSBzdG9yZS5kaXNwYXRjaCDkuK3pl7Tku7Yz55qEIG5leHQg5bCx5pivIHN0b3JlLmRpc3BhdGNoIOWHveaVsO+8jOS4remXtOS7tjPov5Tlm57nmoTlh73mlbAgYWN0aW9uID0+IHsgLi4uIH1cclxuICAgICAgICAgKiDkuK3pl7Tku7Yy5o6l5pS25Lit6Ze05Lu2M+i/lOWbnueahCBhY3Rpb24gPT4geyAuLi4gfSDkvZzkuLrkuK3pl7Tku7Yy55qEIG5leHQg54S25ZCO6L+U5Zue6Ieq5bex55qEIGFjdGlvbiA9PiB7IC4uLiB9XHJcbiAgICAgICAgICog5pyA5ZCO6L+U5Zue5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDvvIzkuK3pl7Tku7Yx55qEIG5leHQg5piv5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5b2T5oiR5Lus5omn6KGM5Lit6Ze05Lu2MeeahCBhY3Rpb24gPT4geyAuLi4gfSDkuK3op6blj5HkuK3pl7Tku7Yx55qEIG5leHQg5byA5aeL5omn6KGM5Lit6Ze05Lu2MueahCBhY3Rpb24gPT4geyAuLi4gfSAs5L6d5qyh57G75o6oLi4uXHJcbiAgICAgICAgICog5pyA5ZCO5omn6KGM5Lit6Ze05Lu2M+eahCBuZXh0IO+8jOiwg+eUqOS6hiBzdG9yZS5kaXNwYXRjaCDlh73mlbBcclxuICAgICAgICAgKiDnm7jlvZPkuo7ov5nkuKogZGlzcGF0Y2gg5piv55So5p2l6Kem5Y+R5omA5pyJ5Lit6Ze05Lu255qE77yM5omn6KGM5a6M5omA5pyJ5Lit6Ze05Lu25ZCO77yM5bCG5omn6KGM55yf5q2j55qEIHN0b3JlLmRpc3BhdGNoIOWHveaVsFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGRpc3BhdGNoID0gY29tcG9zZSguLi5jaGFpbikoc3RvcmUuZGlzcGF0Y2gpO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiDlsIYgc3RvcmUg55qE5YW25LuW5Ye95pWw5LiO57uP6L+H5bCB6KOF55qEIGRpc3BhdGNoIOS4gOWQjOi/lOWbnu+8jOW9ouaIkOaWsOeahOWujOaVtOeahCBzdG9yZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHsgZGlzcGF0Y2ggfSwgc3RvcmUpO1xyXG4gICAgfTtcclxufVxyXG4iLCIvKipcclxuICogYmluZEFjdGlvbkNyZWF0b3JzIOWunueOsFxyXG4gKiDlh73mlbDnmoTkvZznlKjmmK/lsIbnlJ/miJAgYWN0aW9uIOeahOaWueazle+8jOS4jiBkaXNwYXRjaCDnu5PlkIjkvKDpgJLnu5nlrZDlhYPntKDnrYlcclxuICog5o6l5pS25Lik5Liq5Y+C5pWwIGFjdGlvbkNyZWF0b3JzIOWSjCBkaXNwYXRjaFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gYWN0aW9uQ3JlYXRvcnMg5piv5LiA5Liq5oiW5aSa5Liq55Sf5oiQIGFjdGlvbiDnmoTlh73mlbDnu4TmiJDnmoQgb2JqZWN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRpc3BhdGNoIOeUsSByZWR1eCDnmoQgY3JlYXRlU3RvcmUg55Sf5oiQ55qE6Kem5Y+R5Y+R5biDL+iuoumYheeahOaWueazlVxyXG4gKlxyXG4gKiBAcmV0dXJuIHtPYmplY3R9IOi/lOWbnuS4gOS4quW3sue7j+WcqOavj+S4gOS4qiBhY3Rpb25DcmVhdG9yIOS4iue7keWumuS6hiBkaXNwYXRjaCDmlrnms5XnmoTlr7nosaFcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJpbmRBY3Rpb25DcmVhdG9ycyhhY3Rpb25DcmVhdG9ycywgZGlzcGF0Y2gpIHtcclxuICAgIC8qKlxyXG4gICAgICog5Yib5bu6IGJvdW5kQWN0aW9uQ3JlYXRvcnMg5L2c5Li65bCG6KaB6L+U5Zue55qE5a+56LGhXHJcbiAgICAgKiDpgY3ljoYgYWN0aW9uQ3JlYXRvcnMg55qE5omA5pyJ5bGe5oCn77yM6I635Y+WIGFjdGlvbkNyZWF0b3JcclxuICAgICAqIOWGmeS4gOS4quaWueazleaJp+ihjO+8jOaOpeaUtumAmui/hyBhY3Rpb25DcmVhdG9yIOeUn+aIkCBhY3Rpb24g5omA6ZyA6KaB55qE5Y+C5pWwIGFyZ1xyXG4gICAgICogZGlzcGF0Y2gg5ZKMIGFjdGlvbkNyZWF0b3Ig55Sx5LqO6Zet5YyF5LiA55u05a2Y5ZyoXHJcbiAgICAgKiDosIPnlKggKC4uLmFyZykgPT4gZGlzcGF0Y2goYWN0aW9uQ3JlYXRvciguLi5hcmcpKSDml7ZcclxuICAgICAqIGFjdGlvbkNyZWF0b3IoLi4uYXJnKSDov5Tlm54gYWN0aW9uXHJcbiAgICAgKiBkaXNwYXRjaChhY3Rpb24pIOinpuWPkeWPkeW4gy/orqLpmIVcclxuICAgICAqL1xyXG4gICAgY29uc3QgYm91bmRBY3Rpb25DcmVhdG9ycyA9IHt9O1xyXG4gICAgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpLmZvckVhY2goKGl0ZW0pID0+IHtcclxuICAgICAgICBjb25zdCBhY3Rpb25DcmVhdG9yID0gYWN0aW9uQ3JlYXRvcnNbaXRlbV07XHJcbiAgICAgICAgYm91bmRBY3Rpb25DcmVhdG9yc1tpdGVtXSA9ICguLi5hcmcpID0+IGRpc3BhdGNoKGFjdGlvbkNyZWF0b3IoLi4uYXJnKSk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBib3VuZEFjdGlvbkNyZWF0b3JzO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBjb21iaW5lUmVkdWNlcnMg5a6e546wXHJcbiAqIOWHveaVsOeahOS9nOeUqOaYr+WwhuWkmuS4qiByZWR1Y2VyIOaMieeFpyBrZXk6IHZhbHVlIOe7hOaIkOS4gOS4quabtOWkp+eahCByZWR1Y2VyXHJcbiAqIOaOpeaUtuS4gOS4quWPguaVsCByZWR1Y2Vyc1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gcmVkdWNlcnMg5piv5bCG5aSa5LiqIHJlZHVjZXIg57uE5ZCI5oiQ55qE5a+56LGhXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSDov5Tlm57nnJ/mraPmm7/ku6MgcmVkdWNlciDnmoTlh73mlbBcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbWJpbmVSZWR1Y2VycyhyZWR1Y2VycyA9IHt9KSB7XHJcbiAgICAvKipcclxuICAgICAqIGNvbWJpbmVSZWR1Y2VycyDlh73mlbDov5Tlm57kuIDkuKogZnVuY3Rpb25cclxuICAgICAqIOi/meS4quWHveaVsOaYr+ecn+ato+eahCByZWR1Y2VyIOaOpeaUtuS4pOS4quWPguaVsFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSDov5nkuKrmmK/mlbTkvZPnmoTpu5jorqTnirbmgIFcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhY3Rpb24g55So5p2l6Kem5Y+RIHJlZHVjZXIg55qE5a+56LGh77yM5b+F5pyJ5a2X5q61IGFjdGlvbi50eXBlXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybiB7T2JqZWN0fSDov5Tlm57lrozmiJDnmoQgc3RhdGVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNvbWJpbmF0aW9uKHN0YXRlID0ge30sIGFjdGlvbikge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIOmBjeWOhiByZWR1Y2VycyDnmoTmiYDmnInlsZ7mgKfvvIzlj5blvpfmiYDmnInnmoQgcmVkdWNlclxyXG4gICAgICAgICAqIOS4uuavj+S4qiByZWR1Y2VyIOS8oOWFpeWvueW6lOeahCBzdGF0ZSDlkowg5omA6Kem5Y+R55qEIGFjdGlvblxyXG4gICAgICAgICAqIOWwhuWvueW6lOi/lOWbnueahCBzdGF0ZSDmlL7lhaUgbmV4dFN0YXRlIOS4rVxyXG4gICAgICAgICAqIOi/lOWbniBuZXh0U3RhdGVcclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdCBuZXh0U3RhdGUgPSB7fTtcclxuICAgICAgICBPYmplY3Qua2V5cyhyZWR1Y2VycykuZm9yRWFjaCgoa2V5KSA9PiB7XHJcbiAgICAgICAgICAgIG5leHRTdGF0ZVtrZXldID0gcmVkdWNlcnNba2V5XShzdGF0ZVtrZXldLCBhY3Rpb24pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgICB9O1xyXG59XHJcbiIsIi8qKlxyXG4gKiB1eHVua1xyXG4gKiDmjInnhacgcmVkdXgg5rqQ56CB6L+b6KGM5Lu/5Yi2XHJcbiAqIOWPkeW4gy/orqLpmIXmqKHlvI9cclxuICog5oul5pyJIHJlZHV4IOeahOWHoOS5juaJgOacieWKn+iDvVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWR1Y2VyIOeUqOS6juWtmOaUvuaJgOacieeahOaVsOaNruWkhOeQhumAu+i+ke+8jOi/lOWbnuS4i+S4gOS4qnN0YXRl5qCRXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0U3RhdGUg6buY6K6k55qE5Yid5aeL5YyWIHN0YXRlXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGVuaGFuY2VyIOS4uiByZWR1eCDmj5DkvpvmiYDmnInkuK3pl7Tku7bvvIzlj6rog73kvb/nlKgnYXBwbHlNaWRkbGV3YXJlJ+aWueazleadpeeUn+aIkFxyXG4gKlxyXG4gKiBAcmV0dXJuIHtPYmplY3R9IOi/lOWbniBzdG9yZSDph4zpnaLljIXlkKsgcmVkdXgg5omA5pyJ5pWw5o2u5Y+K5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVTdG9yZShyZWR1Y2VyLCBkZWZhdWx0U3RhdGUsIGVuaGFuY2VyKSB7XHJcbiAgICAvLyDliKTmlq3mmK/kuI3mmK/msqHmnIkgZGVmYXVsdFN0YXRlIOWPquaciSBlbmhhbmNlciDlpoLmnpzmmK/ov5nmoLflsLHkuqTmjaLkuIDkuItcclxuICAgIGlmICh0eXBlb2YgZW5oYW5jZXIgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBkZWZhdWx0U3RhdGUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICBlbmhhbmNlciA9IGRlZmF1bHRTdGF0ZTtcclxuICAgICAgICBkZWZhdWx0U3RhdGUgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICAvLyDlpoLmnpzmnInkuK3pl7Tku7blsLHlnKjkuK3pl7Tku7bkuK3miafooYwgY3JlYXRlU3RvcmVcclxuICAgIGlmICh0eXBlb2YgZW5oYW5jZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICByZXR1cm4gZW5oYW5jZXIoY3JlYXRlU3RvcmUpKHJlZHVjZXIsIGRlZmF1bHRTdGF0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGN1cnJlbnRTdGF0ZSA9IGRlZmF1bHRTdGF0ZTtcclxuICAgIGxldCBjdXJyZW50UmVkdWNlciA9IHJlZHVjZXI7XHJcbiAgICBjb25zdCBjdXJyZW50TGlzdGVuZXJzID0gW107XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBkaXNwYXRjaCDlh73mlbDvvIzmiafooYwgcmVkdWNlciDvvIzop6blj5HmiYDmnIkgbGlzdGVuZXJcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYWN0aW9uIOinpuWPkeWPkeW4gy/orqLpmIXnmoTkuovku7ZcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IOaJp+ihjOWQjui/lOWbniBhY3Rpb25cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZGlzcGF0Y2goYWN0aW9uKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICog5YaF572uIHJlZHV4LXRodW5rXHJcbiAgICAgICAgICog5Yik5pat5aaC5p6cIGFjdGlvbiDmmK/kuIDkuKogZnVuY3Rpb24g5bCx5omn6KGM5a6DXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgYWN0aW9uKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3VycmVudFN0YXRlID0gY3VycmVudFJlZHVjZXIoY3VycmVudFN0YXRlLCBhY3Rpb24pO1xyXG4gICAgICAgIGN1cnJlbnRMaXN0ZW5lcnMuZm9yRWFjaChpdGVtID0+IGl0ZW0oKSk7XHJcbiAgICAgICAgcmV0dXJuIGFjdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGdldFN0YXRlIOWHveaVsO+8jOi/lOWbnue7j+i/h+a3seWFi+mahueahCBzdGF0ZSDmoJFcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3VycmVudFN0YXRlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzdWJzY3JpYmUg5Ye95pWw77yM55So5LqO57uR5a6aIOinpuWPkSBkaXNwYXRjaCDmm7TmlrAgc3RhdGUg5pe26Kem5Y+R55qE5Ye95pWwXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4g5Lyg5YWl6ZyA6KaB5Yqg5YWlIGxpc3RlbmVycyDnu5HlrprnmoTlh73mlbBcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0g6Kej6Zmk5pS55Ye95pWw57uR5a6a55qE5pa55rOVXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZShmbikge1xyXG4gICAgICAgIC8vIOWmguaenCBmbiDmsqHmnInmiJbkuI3mmK/kuIDkuKogZnVuY3Rpb24g5oqb5Ye66ZSZ6K+vXHJcbiAgICAgICAgaWYgKCFmbiB8fCB0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gaGFzIGJlZW4gc3Vic2NyaWJlZCEnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gbGlzdGVuZXJzIOmHjOayoeaciei/meS4quaXtu+8jOWKoOi/m+WOu1xyXG4gICAgICAgIGlmIChjdXJyZW50TGlzdGVuZXJzLmluZGV4T2YoZm4pIDwgMCkge1xyXG4gICAgICAgICAgICBjdXJyZW50TGlzdGVuZXJzLnB1c2goZm4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyDov5Tlm57op6PpmaQgbGlzdGVuZXJzIOe7keWumueahOaWueazlVxyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiB1bnN1YnNjcmliZSgpIHtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBjdXJyZW50TGlzdGVuZXJzLmluZGV4T2YoZm4pO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50TGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmVwbGFjZVJlZHVjZXIg5Ye95pWw77yM5o6l5pS25LiA5Liq5paw55qEIHJlZHVjZXIg5Luj5pu/5pen55qEXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV3UmVkdWNlciDmlrDnmoQgcmVkdWNlclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiByZXBsYWNlUmVkdWNlcihuZXdSZWR1Y2VyKSB7XHJcbiAgICAgICAgY3VycmVudFJlZHVjZXIgPSBuZXdSZWR1Y2VyO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzdWJzY3JpYmUsXHJcbiAgICAgICAgZGlzcGF0Y2gsXHJcbiAgICAgICAgZ2V0U3RhdGUsXHJcbiAgICAgICAgcmVwbGFjZVJlZHVjZXJcclxuICAgIH07XHJcbn1cclxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7OztBQVdBLEFBQWUsU0FBUyxPQUFPLENBQUMsR0FBRyxLQUFLLEVBQUU7Ozs7Ozs7OztJQVN0QyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMzRDs7QUNwQkQ7Ozs7Ozs7Ozs7QUFVQSxBQUFlLFNBQVMsZUFBZSxDQUFDLEdBQUcsV0FBVyxFQUFFOzs7Ozs7Ozs7SUFTcEQsT0FBTyxXQUFXLElBQUksQ0FBQyxHQUFHLElBQUksS0FBSzs7Ozs7Ozs7UUFRL0IsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7Ozs7Ozs7UUFPbkMsSUFBSSxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUM7O1FBRXhCLE1BQU0sYUFBYSxHQUFHO1lBQ2xCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtZQUN4QixRQUFRLEVBQUUsQ0FBQyxHQUFHLEdBQUcsS0FBSyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7U0FDekMsQ0FBQzs7OztRQUlGLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7UUFZdkUsUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Ozs7UUFLN0MsT0FB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
