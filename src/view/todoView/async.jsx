import React from 'react';

import store from 'store/store';

import { asynchronousAction } from 'store/action';

import { bindActionCreators } from 'library/uxunk';


const asyncDispatch =  bindActionCreators(asynchronousAction, store.dispatch);

export default class Async extends React.Component {
    render() {
        return (
            <button className='async-btn' onClick={asyncDispatch.asyncLoadAction}>获取数据</button>
        )
    }
}
