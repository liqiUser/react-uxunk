import React from 'react';

import store from './redux/store';

import View from './view';

import { Provider } from './react-redux';

export default class App extends React.Component {
    render() {
        return (
            <Provider value={store}>
                <View />
            </Provider>
        )
    }
}
