import React from 'react';

import { connect } from 'library/react-redux/react-redux_v15';

import { todoAction } from 'store/action';

function filterTodoList(todoList, filter) {
    let newTodoList = todoList.map((item, index) => ({...item, index}));
    if (filter === 'done') {
        newTodoList = newTodoList.filter(item => item.isFinish);
    } else if (filter === 'undone') {
        newTodoList = newTodoList.filter(item => !item.isFinish);
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
    return (
        <ul>
            {
                todoList.map(item => {
                    return (
                        <li key={item.index}>
                            <span onClick={() => toggleList(item.index)}>
                                {
                                    item.isFinish ? 
                                        <s>{item.text}</s> : <span>{item.text}</span>
                                }
                            </span>
                            <button onClick={() => removeList(item.index)}>×</button>
                        </li>
                    )
                })
            }
        </ul>
    )
}

export default connect(mapState, mapDispatch)(TodoList);
