/**
 * Consumer 作为接收 redux 数据的子组件使用
 */
import React from 'react';

import { Consumer } from './provider';

/**
 * connect 是一个高阶组件 第一层接收两个函数
 * @param {Function} mapStateToProps 用于将 redux 中所需要的数据传递给子组件
 * @param {Function} mapDispatchToProps 用于将子组件通过 dispatch 将修改数据传递回 redux
 * 
 * 第二层接收一个 React 组件
 * @param {React} WrappedComponent 木偶组件用于接收 mapStateToProps、mapDispatchToProps 所传递的 props 
 * 
 */
const connect = (mapStateToProps, mapDispatchToProps) => WrappedComponent => {

    return class extends React.Component {
        
        render() {

            const props = this.props;

            return (
                <Consumer>
                    {
                        (store) => {

                            // 执行 mapStateToProps 和 mapDispatchToProps 传入 redux 的所有数据、redux 的 dispatch 方法
                            const mapState = mapStateToProps(store.getState(), props);
                            const mapDispatch = mapDispatchToProps(store.dispatch, props);

                            // 将执行所获取的 redux 数据及 用来触发 dispatch 的方法传入木偶组件中
                            return <WrappedComponent {...mapState} {...mapDispatch} {...props} />
                        }
                    }
                </Consumer>
            )
        }
    }
}

export default connect;
