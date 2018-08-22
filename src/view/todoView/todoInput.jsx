import React from 'react';

import { connect } from 'library/react-redux/react-redux_v16';

import { todoAction } from 'store/action';

const mapState = () => {};

const mapDispatch = disPatch => {
    return {
        addTodo: (text) => {
            disPatch(todoAction.addAction(text))
        }
    }
}

class TodoInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: ''
        }
    }
    handlerChange = e => {
        this.setState({
            [e.target.name]: e.target.value
        })
    }
    handlerClick = () => {
        if (!this.state.text) {
            return false;
        }
        this.props.addTodo(this.state.text);
        this.setState({
            text: ''
        })
    }
    render() {
        return (
            <div>
                <input name='text' onChange={this.handlerChange} value={this.state.text} type='text'/>
                <button onClick={this.handlerClick}>添加</button>
            </div>
        )
    }
}

export default connect(mapState, mapDispatch)(TodoInput);
