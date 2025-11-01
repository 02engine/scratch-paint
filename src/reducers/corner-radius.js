const CHANGE_CORNER_RADIUS = 'scratch-paint/corner-radius/CHANGE_CORNER_RADIUS';
const initialState = 20;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_CORNER_RADIUS:
        // If action.cornerRadius is not a number (e.g. invalid input), keep current state
        return typeof action.cornerRadius === 'number' ? action.cornerRadius : state;
    default:
        return state;
    }
};

// Action creators
const changeCornerRadius = function (cornerRadius) {
    const n = Number(cornerRadius);
    return {
        type: CHANGE_CORNER_RADIUS,
        cornerRadius: Number.isFinite(n) ? Math.max(0, n) : undefined
    };
};

export {
    reducer as default,
    changeCornerRadius,
    CHANGE_CORNER_RADIUS
};