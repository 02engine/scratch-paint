import log from '../log/log';

const CHANGE_IOS_CORNER_SIZE = 'scratch-paint/ios-curvature-mode/CHANGE_IOS_CORNER_SIZE';

const initialState = {
    cornerSize: 0.3  // 角落切片占 min(w,h) 的比例, 默认 30%
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_IOS_CORNER_SIZE:
        if (isNaN(action.cornerSize)) {
            log.warn(`Invalid corner size: ${action.cornerSize}`);
            return state;
        }
        return {cornerSize: Math.max(0.1, Math.min(0.5, action.cornerSize))};
    default:
        return state;
    }
};

// Action creators ==================================
const changeIosCornerSize = function (cornerSize) {
    return {
        type: CHANGE_IOS_CORNER_SIZE,
        cornerSize: cornerSize
    };
};

export {
    reducer as default,
    changeIosCornerSize
};