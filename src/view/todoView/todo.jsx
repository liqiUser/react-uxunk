import React from 'react';

import TodoInput from './todoInput';
import TodoList from './todoList';
import Async from './async';

export default class Todo extends React.Component {
    render() {
        return (
            <div>
                <TodoInput />
                <TodoList />
                <Async />
            </div>
        )
    }
}
