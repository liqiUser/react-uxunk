import React from 'react';

import { Provider } from 'library/react-redux/react-redux_v15';

import store from 'store/store';

import View from './view';

export default class App extends React.Component {
    render() {
        return (
            <Provider value={store}>
                <View />
            </Provider>
        )
    }
}
