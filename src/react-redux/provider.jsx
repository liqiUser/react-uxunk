import React from 'react';

import store from '../redux/store';

const Context = React.createContext();

const Consumer = Context.Consumer;

const ReactProvider = Context.Provider;

export { Consumer };

export default class Provider extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            store: this.props.value
        }
    }
    getStore() {
        this.setState({
            store: this.props.value
        })
    }
    componentDidMount() {
        this.unsubscribe = store.subscribe(this.getStore);
    }
    componentWillUnmount() {
        this.unsubscribe();
    }
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
