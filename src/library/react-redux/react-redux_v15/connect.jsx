import React from 'react';

import PropTypes from 'prop-types';

const connect = (mapState, mapDispatch) => (WrappedComponent) => {

    class Connect extends React.Component {
        /**
         * constructor 里加入 context 不然在组件里无法使用 context
         */
        constructor(props, context) {
            super(props, context);
            this.state = {};
        }
        /**
         * 调用 getStore 来触发 render 从而触发 store.getState() 获取新的数据
         */
        getStore = () => {
            this.setState({})
        }
        /**
         * componentDidMount 中绑定监听 this.getStore
         * componentWillUnmount 中取消监听 this.getStore
         */
        componentDidMount() {
            const { store } = this.context;
            this.unsubscribe = store.subscribe(this.getStore);
        }
        componentWillUnmount() {
            this.unsubscribe();
        }
        render() {
            const { store } = this.context;
            return (
                <WrappedComponent 
                    {...mapState(store.getState(), this.props)} 
                    {...mapDispatch(store.dispatch, this.props)} 
                    {...this.props}
                />
            )
        }
    }
    /**
     * 定义 contextTypes 来拿到在 context 中的 store
     */
    Connect.contextTypes = {
        store: PropTypes.object
    }

    return Connect;
}

export default connect;
