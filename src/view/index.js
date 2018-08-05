import React from 'react';

import { connect } from '../react-redux';

import { todoAction } from '../redux/action';

class Src extends React.Component {
    render() {
        console.log(this.props);
        return (
            <React.Fragment>
                <div onClick={() => this.props.handlerClick('哈哈哈')}>Click Me</div>
                <div onClick={() => console.log(this.props)}>print</div>
            </React.Fragment>
        )
    }
}

function mapState(state, ownProp) {
    return state;
}

function mapDispatch(dispatch) {
    return {
        handlerClick: (addText) => dispatch(todoAction.addAction(addText))
    }
}

export default connect(mapState, mapDispatch)(Src);