import {combineReducers} from 'redux';
import modeReducer from './modes';
import bitBrushSizeReducer from './bit-brush-size';
import bitEraserSizeReducer from './bit-eraser-size';
import brushModeReducer from './brush-mode';
import eraserModeReducer from './eraser-mode';
import colorReducer from './color';
import fillBitmapShapesReducer from './fill-bitmap-shapes';
import formatReducer from './format';
import hoverReducer from './hover';
import modalsReducer from './modals';
import selectedItemReducer from './selected-items';
import clipboardReducer from './clipboard';
import cornerRadiusReducer from './corner-radius';

export default combineReducers({
    mode: modeReducer,
    bitBrushSize: bitBrushSizeReducer,
    bitEraserSize: bitEraserSizeReducer,
    brushMode: brushModeReducer,
    eraserMode: eraserModeReducer,
    color: colorReducer,
    fillBitmapShapes: fillBitmapShapesReducer,
    format: formatReducer,
    hoveredItemId: hoverReducer,
    modals: modalsReducer,
    selectedItems: selectedItemReducer,
    clipboard: clipboardReducer,
    cornerRadius: cornerRadiusReducer
});