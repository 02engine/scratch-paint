import paper from '@turbowarp/paper';
import log from '../../log/log';
import {getSelectedLeafItems} from '../selection';
import {isPGTextItem} from '../item';

/**
 * Tool for drawing rounded rectangles
 */
class RoundedRectTool extends paper.Tool {
    /**
     * @param {function} setHoveredItem Callback to set the hovered item
     * @param {function} clearHoveredItem Callback to clear the hovered item
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {number} cornerRadius The corner radius from Redux state
     */
    constructor (setHoveredItem, clearHoveredItem, setSelectedItems, clearSelectedItems, onUpdateImage, cornerRadius) {
        super();
        this.setHoveredItem = setHoveredItem;
        this.clearHoveredItem = clearHoveredItem;
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.cornerRadius = cornerRadius;
        
        // Tool state
        this.active = false;
        this.roundedRect = null;
        this.startPoint = null;
        this.endPoint = null;
        this.guide = null;
        this.prevHoveredItemId = null;
        this.lastDrawnRect = null;
        
        // 初始化工具选项
        this.minDistance = 2; // 防止意外点击创建微小形状
        
        // Event bindings
        this.onMouseDown = this.handleMouseDown.bind(this);
        this.onMouseDrag = this.handleMouseDrag.bind(this);
        this.onMouseMove = this.handleMouseMove.bind(this);
        this.onMouseUp = this.handleMouseUp.bind(this);
        
        // 设置tool.minDistance以防止产生微小形状
        this.minDistance = 2;
    }
    
    /**
     * Create a rounded rectangle path
     * @param {paper.Point} from Start point
     * @param {paper.Point} to End point
     * @param {number} radius Corner radius
     * @returns {paper.Path} The created rounded rectangle path
     */
    _createRoundedRect (from, to, isGuide) {
        const topLeft = new paper.Point(
            Math.min(from.x, to.x),
            Math.min(from.y, to.y)
        );
        const bottomRight = new paper.Point(
            Math.max(from.x, to.x),
            Math.max(from.y, to.y)
        );
        const rect = new paper.Rectangle(topLeft, bottomRight);
        
        // 计算圆角半径 - 根据矩形大小自适应，但不超过12
        const cornerRadius = Math.min(12, Math.min(Math.abs(rect.width), Math.abs(rect.height)) / 4);
        const path = new paper.Path.RoundRectangle(rect, cornerRadius);

        if (isGuide) {
            // 如果是参考线，使用虚线样式
            path.strokeColor = 'rgba(0, 0, 0, 0.4)';
            path.strokeWidth = 1;
            path.dashArray = [4, 4];
            path.fillColor = null;
            path.guide = true;
        } else {
            // 获取活动图层
            const layer = paper.project.activeLayer;
            
            // 设置样式
            path.fillColor = layer.data && layer.data.fillColor ? 
                layer.data.fillColor : 
                this.lastDrawnRect ? this.lastDrawnRect.fillColor : 'white';
            
            path.strokeColor = layer.data && layer.data.strokeColor ? 
                layer.data.strokeColor : 
                this.lastDrawnRect ? this.lastDrawnRect.strokeColor : 'black';
            
            path.strokeWidth = layer.data && layer.data.strokeWidth ? 
                layer.data.strokeWidth : 
                this.lastDrawnRect ? this.lastDrawnRect.strokeWidth : 1;
            
            // 设置连接点样式
            path.strokeCap = 'round';
            path.strokeJoin = 'round';
            
            // 保存当前样式以供下次使用
            this.lastDrawnRect = path;
        }
        
        return path;
    }

    /**
     * @param {paper.Item} prevHoveredItemId ID of the highlight item
     */
    setPrevHoveredItemId (prevHoveredItemId) {
        this.prevHoveredItemId = prevHoveredItemId;
    }

    handleMouseDown (event) {
        if (event.event.button > 0) return; // Only handle left mouse button
        
        // 清除选择并保存起始点
        this.clearSelectedItems();
        this.active = true;
        this.startPoint = event.point;
        this.endPoint = event.point;
        
        // 移除任何存在的参考线
        if (this.guide) {
            this.guide.remove();
            this.guide = null;
        }
        
        // 创建新的参考线矩形
        this.guide = this._createRoundedRect(this.startPoint, this.endPoint, true);
        
        // 清除现有的矩形（如果有）
        if (this.roundedRect) {
            this.roundedRect.remove();
            this.roundedRect = null;
        }
    }
    
    handleMouseDrag (event) {
        if (!this.active) return;
        
        // 更新终点
        this.endPoint = event.point;
        
        // 处理shift键约束（正方形）
        if (event.modifiers.shift) {
            const width = this.endPoint.x - this.startPoint.x;
            const height = this.endPoint.y - this.startPoint.y;
            const size = Math.max(Math.abs(width), Math.abs(height));
            this.endPoint = this.startPoint.add(new paper.Point(
                Math.sign(width) * size,
                Math.sign(height) * size
            ));
        }
        
        // 更新参考线
        if (this.guide) {
            this.guide.remove();
        }
        this.guide = this._createRoundedRect(this.startPoint, this.endPoint, true);
    }
    
    handleMouseMove (event) {
        if (this.active) return;
        
        // 处理悬停高亮
        const hitResult = paper.project.hitTest(event.point, {
            fill: true,
            stroke: true,
            tolerance: 2,
            match: item => {
                return !item.guide && // 忽略参考线
                    item.parent && // 必须有父级
                    item.parent.className === 'Layer' && // 必须在图层中
                    (!item.data || !item.data.isHelperItem); // 忽略辅助项
            }
        });
        
        if (hitResult && hitResult.item) {
            const hoveredItem = hitResult.item;
            if (hoveredItem.data && hoveredItem.data.id !== this.prevHoveredItemId) {
                this.setHoveredItem(hoveredItem.data.id);
                this.prevHoveredItemId = hoveredItem.data.id;
            }
        } else if (this.prevHoveredItemId) {
            this.clearHoveredItem();
            this.prevHoveredItemId = null;
        }
    }
    
    handleMouseUp (event) {
        if (!this.active) return;
        
        // 移除参考线
        if (this.guide) {
            this.guide.remove();
            this.guide = null;
        }
        
        // 检查是否是微小移动
        if (this.startPoint.getDistance(this.endPoint) < this.minDistance) {
            this.active = false;
            return;
        }
        
        // 获取当前图层
        const layer = paper.project.activeLayer;
        if (!layer.data) {
            layer.data = {isPaintingLayer: true};
        }
        
        // 创建最终的圆角矩形
        this.roundedRect = this._createRoundedRect(this.startPoint, this.endPoint, false);
        
        // 设置数据属性
        this.roundedRect.data = {
            id: `rounded-rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'rounded-rect',
            isRoundedRect: true,
            fillColor: this.roundedRect.fillColor.toCSS(true),
            strokeColor: this.roundedRect.strokeColor.toCSS(true),
            strokeWidth: this.roundedRect.strokeWidth,
            name: 'Rounded Rectangle'
        };
        
        // 将矩形添加到活动图层
        if (!this.roundedRect.parent) {
            layer.addChild(this.roundedRect);
        }
        
        // 清除所有现有选择
        paper.project.deselectAll();
        this.clearSelectedItems();
        
        // 选择新创建的矩形
        this.roundedRect.selected = true;
        this.setSelectedItems();
        
        // 更新画布
        this.onUpdateImage();
        paper.view.update();
        
        // 重置状态
        this.active = false;
        this.startPoint = null;
        this.endPoint = null;
    }
    
    deactivateTool () {
        // 清理所有临时对象
        if (this.guide) {
            this.guide.remove();
            this.guide = null;
        }
        
        if (this.roundedRect && !this.roundedRect.data) {
            // 只移除没有数据属性的临时矩形
            this.roundedRect.remove();
            this.roundedRect = null;
        }
        
        // 重置所有状态
        this.active = false;
        this.startPoint = null;
        this.endPoint = null;
        this.prevHoveredItemId = null;
        
        // 清除选择
        this.clearSelectedItems();
        paper.view.update();
    }
    
    // 设置上一个悬停项目ID
    setPrevHoveredItemId (prevHoveredItemId) {
        this.prevHoveredItemId = prevHoveredItemId;
    }
}

export default RoundedRectTool;
