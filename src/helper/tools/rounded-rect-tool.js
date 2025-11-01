import paper from '@turbowarp/paper';
import Modes from '../../lib/modes';
import {styleShape} from '../style-path';
import {clearSelection} from '../selection';
import {getSquareDimensions} from '../math';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';

/**
 * Tool for drawing rounded rectangles.
 */
class RoundedRectTool extends paper.Tool {
    static get TOLERANCE () {
        return 2;
    }
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {function} setCursor Callback to set the visible mouse cursor
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {number} cornerRadius The corner radius from Redux state
     */
    constructor (setSelectedItems, clearSelectedItems, setCursor, onUpdateImage, cornerRadius) {
        super();
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.cornerRadius = cornerRadius;
        
        this.boundingBoxTool = new BoundingBoxTool(
            Modes.RECT,
            setSelectedItems,
            clearSelectedItems,
            setCursor,
            onUpdateImage
        );
        const nudgeTool = new NudgeTool(Modes.RECT, this.boundingBoxTool, onUpdateImage);

        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = nudgeTool.onKeyUp;
        this.onKeyDown = nudgeTool.onKeyDown;

        this.roundedRect = null;
        this.colorState = null;
        this.isBoundingBoxMode = null;
        this.active = false;
    }
    getHitOptions () {
        return {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            match: hitResult =>
                (hitResult.item.data && (hitResult.item.data.isScaleHandle || hitResult.item.data.isRotHandle)) ||
                hitResult.item.selected, // Allow hits on bounding box and selected only
            tolerance: RoundedRectTool.TOLERANCE / paper.view.zoom
        };
    }
    /**
     * Should be called if the selection changes to update the bounds of the bounding box.
     * @param {Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
    }
    setColorState (colorState) {
        this.colorState = colorState;
    }
    /**
     * Create a rounded rectangle path
     * @param {paper.Point} from Start point
     * @param {paper.Point} to End point
     * @returns {paper.Path} The created rounded rectangle path
     */
    _createRoundedRect (from, to) {
        const topLeft = new paper.Point(
            Math.min(from.x, to.x),
            Math.min(from.y, to.y)
        );
        const bottomRight = new paper.Point(
            Math.max(from.x, to.x),
            Math.max(from.y, to.y)
        );
        const rect = new paper.Rectangle(topLeft, bottomRight);
        
        // Calculate corner radius - adaptive based on rectangle size, but not exceeding 12
        const cornerRadius = Math.min(12, Math.min(Math.abs(rect.width), Math.abs(rect.height)) / 4);
        const path = new paper.Path.RoundRectangle(rect, cornerRadius);
        
        return path;
    }
    handleMouseDown (event) {
        if (event.event.button > 0) return; // only first mouse button
        this.active = true;

        if (this.boundingBoxTool.onMouseDown(
            event, false /* clone */, false /* multiselect */, false /* doubleClicked */, this.getHitOptions())) {
            this.isBoundingBoxMode = true;
        } else {
            this.isBoundingBoxMode = false;
            clearSelection(this.clearSelectedItems);
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseDrag(event);
            return;
        }

        if (this.roundedRect) {
            this.roundedRect.remove();
        }

        const rect = new paper.Rectangle(event.downPoint, event.point);
        const squareDimensions = getSquareDimensions(event.downPoint, event.point);
        if (event.modifiers.shift) {
            rect.size = squareDimensions.size.abs();
        }

        this.roundedRect = this._createRoundedRect(event.downPoint, event.point);
        if (event.modifiers.alt) {
            this.roundedRect.position = event.downPoint;
        } else if (event.modifiers.shift) {
            this.roundedRect.position = squareDimensions.position;
        } else {
            const dimensions = event.point.subtract(event.downPoint);
            this.roundedRect.position = event.downPoint.add(dimensions.multiply(0.5));
        }

        styleShape(this.roundedRect, this.colorState);
    }
    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return; // only first mouse button

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseUp(event);
            this.isBoundingBoxMode = null;
            return;
        }

        if (this.roundedRect) {
            if (this.roundedRect.area < RoundedRectTool.TOLERANCE / paper.view.zoom) {
                // Tiny rounded rectangle created unintentionally?
                this.roundedRect.remove();
                this.roundedRect = null;
            } else {
                this.roundedRect.selected = true;
                this.setSelectedItems();
                this.onUpdateImage();
                this.roundedRect = null;
            }
        }
        this.active = false;
    }
    handleMouseMove (event) {
        this.boundingBoxTool.onMouseMove(event, this.getHitOptions());
    }
    deactivateTool () {
        this.boundingBoxTool.deactivateTool();
    }
}

export default RoundedRectTool;
