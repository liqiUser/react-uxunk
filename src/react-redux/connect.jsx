import React from 'react';

import { Consumer } from './provider';

const connect = (mapStateToProps, mapDispatchToProps) => WrappedComponent => {
    return class extends React.Component {
        render() {
            const props = this.props;
            return (
                <Consumer>
                    {
                        (store) => {
                            const mapState = mapStateToProps(store.getState(), props);
                            const mapDispatch = mapDispatchToProps(store.dispatch, props);
                            return <WrappedComponent {...mapState} {...mapDispatch} {...props} />
                        }
                    }
                </Consumer>
            )
        }
    }
}

export default connect;
