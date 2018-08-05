import React from 'react';

import { connect } from '../react-redux';

class Src extends React.Component {
    render() {
        console.log(this.props);
        return (
            <div>111</div>
        )
    }
}

function mapState(state, ownProp) {
    return state;
}

function mapDispatch() {

}

export default connect(mapState, mapDispatch)(Src);