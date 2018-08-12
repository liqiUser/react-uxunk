import React from 'react';

import TodoInput from './todoInput';
import TodoList from './todoList';

export default class Todo extends React.Component {
    render() {
        return (
            <div>
                <TodoInput />
                <TodoList />
            </div>
        )
    }
}
