import paper from '@turbowarp/paper';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../lib/modes';
import {MIXED} from '../helper/style-path';
import ColorStyleProptype from '../lib/color-style-proptype';
import GradientTypes from '../lib/gradient-types';

import {changeFillColor, clearFillGradient, DEFAULT_COLOR} from '../reducers/fill-style';
import {changeStrokeColor, clearStrokeGradient} from '../reducers/stroke-style';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {setCursor} from '../reducers/cursor';

import {clearSelection, getSelectedLeafItems} from '../helper/selection';
import IosCurvatureTool from '../helper/tools/ios-curvature-tool';
import IosCurvatureModeComponent from '../components/ios-curvature-mode/ios-curvature-mode.jsx';

class IosCurvatureMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'validateColorState'
        ]);
    }
    componentDidMount () {
        if (this.props.isIosCurvatureModeActive) {
            this.activateTool(this.props);
        }
    }
    componentWillReceiveProps (nextProps) {
        if (this.tool && nextProps.colorState !== this.props.colorState) {
            this.tool.setColorState(nextProps.colorState);
        }
        if (this.tool && nextProps.selectedItems !== this.props.selectedItems) {
            this.tool.onSelectionChanged(nextProps.selectedItems);
        }

        // Update corner size when it changes
        if (this.tool && nextProps.cornerSize !== this.props.cornerSize) {
            this.tool.setCornerSize(nextProps.cornerSize);
        }

        if (nextProps.isIosCurvatureModeActive && !this.props.isIosCurvatureModeActive) {
            this.activateTool();
        } else if (!nextProps.isIosCurvatureModeActive && this.props.isIosCurvatureModeActive) {
            this.deactivateTool();
        }
    }
    shouldComponentUpdate (nextProps) {
        return nextProps.isIosCurvatureModeActive !== this.props.isIosCurvatureModeActive;
    }
    componentWillUnmount () {
        if (this.tool) {
            this.deactivateTool();
        }
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        this.validateColorState();

        this.tool = new IosCurvatureTool(
            this.props.setSelectedItems,
            this.props.clearSelectedItems,
            this.props.setCursor,
            this.props.onUpdateImage
        );
        this.tool.setColorState(this.props.colorState);
        this.tool.setCornerSize(this.props.cornerSize);
        this.tool.activate();
    }
    validateColorState () {
        const {strokeWidth} = this.props.colorState;
        const fillColor1 = this.props.colorState.fillColor.primary;
        let fillColor2 = this.props.colorState.fillColor.secondary;
        let fillGradient = this.props.colorState.fillColor.gradientType;
        const strokeColor1 = this.props.colorState.strokeColor.primary;
        let strokeColor2 = this.props.colorState.strokeColor.secondary;
        let strokeGradient = this.props.colorState.strokeColor.gradientType;

        if (fillColor2 === MIXED) {
            this.props.clearFillGradient();
            fillColor2 = null;
            fillGradient = GradientTypes.SOLID;
        }
        if (strokeColor2 === MIXED) {
            this.props.clearStrokeGradient();
            strokeColor2 = null;
            strokeGradient = GradientTypes.SOLID;
        }

        const fillColorMissing = fillColor1 === MIXED ||
            (fillGradient === GradientTypes.SOLID && fillColor1 === null) ||
            (fillGradient !== GradientTypes.SOLID && fillColor1 === null && fillColor2 === null);
        const strokeColorMissing = strokeColor1 === MIXED ||
            strokeWidth === null ||
            strokeWidth === 0 ||
            (strokeGradient === GradientTypes.SOLID && strokeColor1 === null) ||
            (strokeGradient !== GradientTypes.SOLID && strokeColor1 === null && strokeColor2 === null);

        if (fillColorMissing && strokeColorMissing) {
            this.props.onChangeFillColor(DEFAULT_COLOR);
            this.props.clearFillGradient();
            this.props.onChangeStrokeColor(null);
            this.props.clearStrokeGradient();
        } else if (fillColorMissing && !strokeColorMissing) {
            this.props.onChangeFillColor(null);
            this.props.clearFillGradient();
        } else if (!fillColorMissing && strokeColorMissing) {
            this.props.onChangeStrokeColor(null);
            this.props.clearStrokeGradient();
        }
    }
    deactivateTool () {
        this.tool.deactivateTool();
        this.tool.remove();
        this.tool = null;
    }
    render () {
        return (
            <IosCurvatureModeComponent
                isSelected={this.props.isIosCurvatureModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

IosCurvatureMode.propTypes = {
    clearFillGradient: PropTypes.func.isRequired,
    clearStrokeGradient: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    colorState: PropTypes.shape({
        fillColor: ColorStyleProptype,
        strokeColor: ColorStyleProptype,
        strokeWidth: PropTypes.number
    }).isRequired,
    cornerSize: PropTypes.number.isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isIosCurvatureModeActive: PropTypes.bool.isRequired,
    onChangeFillColor: PropTypes.func.isRequired,
    onChangeStrokeColor: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    selectedItems: PropTypes.arrayOf(PropTypes.instanceOf(paper.Item)),
    setCursor: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    colorState: state.scratchPaint.color,
    isIosCurvatureModeActive: state.scratchPaint.mode === Modes.IOS_CURVATURE,
    selectedItems: state.scratchPaint.selectedItems,
    cornerSize: state.scratchPaint.iosCurvatureMode.cornerSize
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    clearFillGradient: () => {
        dispatch(clearFillGradient());
    },
    clearStrokeGradient: () => {
        dispatch(clearStrokeGradient());
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems(), false /* bitmapMode */));
    },
    setCursor: cursorString => {
        dispatch(setCursor(cursorString));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.IOS_CURVATURE));
    },
    onChangeFillColor: fillColor => {
        dispatch(changeFillColor(fillColor));
    },
    onChangeStrokeColor: strokeColor => {
        dispatch(changeStrokeColor(strokeColor));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(IosCurvatureMode);