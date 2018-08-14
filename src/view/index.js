import React from 'react';

import Filter from './filterView';
import Todo from './todoView';

import './index.css';

class Src extends React.Component {
    render() {
        return (
            <div className='todo-list'>
                <Todo />
                <Filter />
            </div>
        )
    }
}

export default Src;
