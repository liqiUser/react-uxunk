import React from 'react';

import PropTypes from 'prop-types';

const connect = (mapState, mapDispatch) => (WrappedComponent) => {

    class Connect extends React.Component {
        constructor(props, context) {
            super(props, context);
            this.state = {};
        }
        getStore = () => {
            this.setState({})
        }
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
    Connect.contextTypes = {
        store: PropTypes.object
    }

    return Connect;
}

export default connect;
