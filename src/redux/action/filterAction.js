import { filterActionType } from '../actionType';

export const filterAction = (filterType) => ({
    type: filterActionType.FILTER,
    filterType
})
