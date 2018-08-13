import { asynchronousActionType } from '../actionType';

import store from '../store';

export const asyncLoadAction = () => () => {
    const asyncData = {
        text: '异步加载',
        isFinish: true
    }
    setTimeout(() => {
        Math.random() > 0.3 ? store.dispatch(asyncFinish(asyncData)) : asyncFail()
    }, 2000)
}

export const asyncFinish = (data) => ({
    type: asynchronousActionType.ASYNCFINIST,
    data
})

export const asyncFail = () => {
    alert('数据加载失败');
}
