import React from 'react';

import PropTypes from 'prop-types';

export default class Provider extends React.Component {
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

Provider.childContextTypes = {
    store: PropTypes.object.isRequired
}

Provider.propTypes = {
    value: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired
}
