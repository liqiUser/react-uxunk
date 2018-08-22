/**
 * React V16 创建 react-redux
 */
import React from 'react';

import PropTypes from 'prop-types';

const Context = React.createContext();

/**
 * 将通过 React.createContext 创建的对象拆分成 Consumer 和 Provider
 * Consumer 是作为触发的子组件放在 connect 中
 * Provider 作为整个应用的数据中心
 */
const Consumer = Context.Consumer;
const ReactProvider = Context.Provider;

export { Consumer };

/**
 * 创建出的 Provider 接收一个参数 value 将使用 redux 创建好的 store 导入
 */
export default class Provider extends React.Component {
    constructor(props) {
        super(props);
        // 将接收的 store 传入 state 中
        this.state = {
            store: this.props.value
        }
    }
    // 给这个函数绑定监听，触发 dispatch 时重新触发 setState 让所有 Consumer 组件重新接收值
    getStore = () => {
        this.setState({
            store: {...this.props.value}
        })
    }
    // 绑定监听
    componentDidMount() {
        const { store } = this.state;
        this.unsubscribe = store.subscribe(this.getStore);
    }
    // Unmount 时解除绑定
    componentWillUnmount() {
        this.unsubscribe();
    }
    // 用 V16 的方法创建 context
    render() {
        const { children } = this.props;
        const { store } = this.state;
        return (
            <ReactProvider value={store}>
                { children }
            </ReactProvider>
        )
    }
};

Provider.propTypes = {
    value: PropTypes.object.isRequired
}
