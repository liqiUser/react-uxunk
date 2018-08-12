import React from 'react';

import { connect } from '../../react-redux';

import { filterAction } from '../../redux/action';

const FilterList = {
    all: '全部',
    done: '完成',
    undone: '未完成'
}

const mapState = state => {
    return {
        filterType: state.filter
    }
}

const mapDispatch = dispatch => {
    return {
        filterTabs: (text) => {
            dispatch(filterAction.filterAction(text))
        }
    }
}

function Filter({filterType, filterTabs}) {
    return (
        <ul>
            {
                Object.keys(FilterList).map(item => {
                    return (
                        <li onClick={() => filterTabs(item)} key={item}>
                            {
                                item === filterType ? 
                                    <b>{ FilterList[item] }</b> : <span>{ FilterList[item] }</span>
                            }
                        </li>
                    )
                })
            }
        </ul>
    )
}

export default connect(mapState, mapDispatch)(Filter);
