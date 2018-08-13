import React from 'react';
import store from '../../redux/store';
import { bindActionCreators } from '../../uxunk';
import { asynchronousAction } from '../../redux/action';

const asyncDispatch =  bindActionCreators(asynchronousAction, store.dispatch);

export default class Async extends React.Component {
    render() {
        return (
            <button className='async-btn' onClick={asyncDispatch.asyncLoadAction}>获取数据</button>
        )
    }
}
