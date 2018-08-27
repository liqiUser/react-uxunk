import React from 'react';

import PropTypes from 'prop-types';
/**
 * Provider 组件接收两个 props: children 和 value
 * children 所渲染的子元素
 * value 为 uxunk 所创建的 store
 */
export default class Provider extends React.Component {
    /**
     * 将 this.props.value 当做 store 传递给 context
     */
    getChildContext() {
        return {
            store: this.props.value
        }
    }
    render() {
        return (
            <React.Fragment>
                {this.props.children}
            </React.Fragment>
        )
    }
}

/**
 * 使用老版本的 context 必须使用 childContextTypes 定义
 * 定义一个名称为 store 的 context
 */
Provider.childContextTypes = {
    store: PropTypes.object.isRequired
}

Provider.propTypes = {
    value: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired
}
