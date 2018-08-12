import React from 'react';

import { connect } from '../../react-redux';

import { todoAction } from '../../redux/action';

function filterTodoList(todoList, filter) {
    let newTodoList;
    if (filter === 'done') {
        newTodoList = todoList.filter(item => item.isFinish);
    } else if (filter === 'undone') {
        newTodoList = todoList.filter(item => !item.isFinish);
    } else {
        newTodoList = todoList;
    }
    return newTodoList
}

const mapState = state => {
    return {
        todoList: filterTodoList(state.todo, state.filter)
    }
}

const mapDispatch = dispatch => {
    return {
        removeList: index => {
            dispatch(todoAction.reomveAction(index))
        },
        toggleList: index => {
            dispatch(todoAction.toggleAction(index))
        }
    }
}

function TodoList({todoList, removeList, toggleList}) {
    console.log(todoList);
    return (
        <ul>
            {
                todoList.map(item => {
                    return (
                        <li key={item.id}>
                            <span onClick={() => toggleList(item.id)}>
                                {
                                    item.isFinish ? 
                                        <s>{item.text}</s> : <span>{item.text}</span>
                                }
                            </span>
                            <button onClick={() => removeList(item.id)}>×</button>
                        </li>
                    )
                })
            }
        </ul>
    )
}

export default connect(mapState, mapDispatch)(TodoList);
