import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';
import messages from '../../lib/messages.js';
import iosCurvatureIcon from './ios-curvature.svg';

const IosCurvatureModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.iosCurvature}
        imgSrc={iosCurvatureIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="I"
    />
);

IosCurvatureModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default IosCurvatureModeComponent;