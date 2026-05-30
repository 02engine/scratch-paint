import paper from '@turbowarp/paper';
import Modes from '../../lib/modes';
import {clearSelection} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';

/**
 * iOS 官方容器 Squircle 曲率的精细 SVG 路径数据
 * 完全复制自 pen.html
 */
const IOS_PATH_DATA = "M1023.99 358c0-13.67 0.01-27.34-0.08-41.01-0.06-11.51-0.2-23.02-0.51-34.53-0.68-25.08-2.15-50.38-6.61-75.19-4.53-25.16-11.91-48.58-23.54-71.44-11.44-22.47-26.39-43.03-44.22-60.86-17.83-17.83-38.39-32.78-60.86-44.22-22.86-11.63-46.28-19.01-71.44-23.54-24.81-4.46-50.11-5.93-75.19-6.61-11.51-0.31-23.02-0.45-34.53-0.51-13.67-0.09-27.34-0.08-41.01-0.08h-308c-13.67 0-27.34-0.01-41.01 0.08-11.51 0.06-23.02 0.2-34.53 0.51-25.08 0.68-50.38 2.15-75.19 6.61-25.16 4.53-48.58 11.91-71.44 23.54-22.47 11.44-43.03 26.39-60.86 44.22-17.83 17.83-32.78 38.39-44.22 60.86-11.63 22.86-19.01 46.28-23.54 71.44-4.46 24.81-5.93 50.11-6.61 75.19-0.31 11.51-0.45 23.02-0.51 34.53-0.09 13.67-0.08 27.34-0.08 41.01v308c0 13.67-0.01 27.34 0.08 41.01 0.06 11.51 0.2 23.02 0.51 34.53 0.68 25.08 2.15 50.38 6.61 75.19 4.53 25.16 11.91 48.58 23.54 71.44 11.44 22.47 26.39 43.03 44.22 60.86 17.83 17.83 38.39 32.78 60.86 44.22 22.86 11.63 46.28 19.01 71.44 23.54 24.81 4.46 50.11 5.93 75.19 6.61 11.51 0.31 23.02 0.45 34.53 0.51 13.67 0.09 27.34 0.08 41.01 0.08h308c13.67 0 27.34 0.01 41.01-0.08 11.51-0.06 23.02-0.2 34.53-0.51 25.08-0.68 50.38-2.15 75.19-6.61 25.16-4.53 48.58-11.91 71.44-23.54 22.47-11.44 43.03-26.39 60.86-44.22 17.83-17.83 32.78-38.39 44.22-60.86 11.63-22.86 19.01-46.28 23.54-71.44 4.46-24.81 5.93-50.11 6.61-75.19 0.31-11.51 0.45-23.02 0.51-34.53 0.09-13.67 0.08-27.34 0.08-41.01z";

/**
 * Tool for drawing iOS continuous curvature rectangles (Squircles).
 * 完全按照 pen.html 的绘制方法和函数公式实现:
 * 1. 使用 iOS 官方 squircle SVG 路径定义 9 个角落切片
 * 2. 拖拽时实时拉伸拼接，1px 同色重叠消除白边
 * 3. 鼠标抬起时 unite() 合并成纯净单一路径
 */
class IosCurvatureTool extends paper.Tool {
    static get TOLERANCE () {
        return 2;
    }
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {function} setCursor Callback to set the visible mouse cursor
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     */
    constructor (setSelectedItems, clearSelectedItems, setCursor, onUpdateImage) {
        super();
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.boundingBoxTool = new BoundingBoxTool(
            Modes.IOS_CURVATURE,
            setSelectedItems,
            clearSelectedItems,
            setCursor,
            onUpdateImage
        );
        const nudgeTool = new NudgeTool(Modes.IOS_CURVATURE, this.boundingBoxTool, onUpdateImage);

        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = nudgeTool.onKeyUp;
        this.onKeyDown = nudgeTool.onKeyDown;

        this.rect = null;
        this.colorState = null;
        this.isBoundingBoxMode = null;
        this.active = false;
        this.cornerSize = 0.3; // 默认 30%，与 pen.html 一致

        // 初始化九宫格切片——完全按照 pen.html 的逻辑
        this.slices = {};
        this._initSlices();
    }

    /**
     * 初始化九宫格切片基准——完全复制 pen.html 的 initSlices() 逻辑
     */
    _initSlices () {
        const basePath = new paper.Path(IOS_PATH_DATA);
        basePath.visible = false;
        const b = basePath.bounds;
        const cs = b.width * 0.3; // 角落切片基准比例

        const rects = {
            topLeft: new paper.Rectangle(b.topLeft, new paper.Size(cs, cs)),
            topRight: new paper.Rectangle(b.topRight.subtract(new paper.Point(cs, 0)), new paper.Size(cs, cs)),
            bottomLeft: new paper.Rectangle(b.bottomLeft.subtract(new paper.Point(0, cs)), new paper.Size(cs, cs)),
            bottomRight: new paper.Rectangle(b.bottomRight.subtract(new paper.Point(cs, cs)), new paper.Size(cs, cs)),
            top: new paper.Rectangle(b.topLeft.add(new paper.Point(cs, 0)), new paper.Size(b.width - cs * 2, cs)),
            bottom: new paper.Rectangle(b.bottomLeft.add(new paper.Point(cs, -cs)), new paper.Size(b.width - cs * 2, cs)),
            left: new paper.Rectangle(b.topLeft.add(new paper.Point(0, cs)), new paper.Size(cs, b.height - cs * 2)),
            right: new paper.Rectangle(b.topRight.add(new paper.Point(-cs, cs)), new paper.Size(cs, b.height - cs * 2)),
            center: new paper.Rectangle(b.topLeft.add(new paper.Point(cs, cs)), new paper.Size(b.width - cs * 2, b.height - cs * 2))
        };

        for (let key in rects) {
            this.slices[key] = basePath.intersect(new paper.Path.Rectangle(rects[key]));
            this.slices[key].visible = false;
        }
        basePath.remove();
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
                hitResult.item.selected,
            tolerance: IosCurvatureTool.TOLERANCE / paper.view.zoom
        };
    }

    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
    }

    setColorState (colorState) {
        this.colorState = colorState;
    }

    setCornerSize (size) {
        this.cornerSize = size;
    }

    handleMouseDown (event) {
        if (event.event.button > 0) return;
        this.active = true;

        if (this.boundingBoxTool.onMouseDown(
            event, false, false, false, this.getHitOptions())) {
            this.isBoundingBoxMode = true;
        } else {
            this.isBoundingBoxMode = false;
            clearSelection(this.clearSelectedItems);
        }
    }

    handleMouseDrag (event) {
        if (event.event.button > 0 || !this.active) return;

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseDrag(event);
            return;
        }

        if (this.rect) {
            this.rect.remove();
            this.rect = null;
        }

        // 计算矩形区域——完全按照 pen.html 的拖拽逻辑
        let rect;
        if (event.modifiers.shift) {
            // Shift 锁定正方形——完全按照 pen.html 的 shift 处理
            let size = Math.max(
                Math.abs(event.point.x - event.downPoint.x),
                Math.abs(event.point.y - event.downPoint.y)
            );
            let signX = event.point.x >= event.downPoint.x ? 1 : -1;
            let signY = event.point.y >= event.downPoint.y ? 1 : -1;
            rect = new paper.Rectangle(
                event.downPoint,
                new paper.Point(event.downPoint.x + size * signX, event.downPoint.y + size * signY)
            );
        } else {
            rect = new paper.Rectangle(event.downPoint, event.point);
        }

        if (rect.width > 5 && rect.height > 5) {
            // 构建预览组——完全按照 pen.html 的 9-grid 拼接逻辑
            const previewGroup = new paper.Group();

            const targetCornerSize = Math.min(rect.width, rect.height) * this.cornerSize;
            const targetCenterWidth = Math.max(0, rect.width - targetCornerSize * 2);
            const targetCenterHeight = Math.max(0, rect.height - targetCornerSize * 2);

            // 获取填充颜色
            const fillColor = (this.colorState && this.colorState.fillColor && this.colorState.fillColor.primary) ?
                this.colorState.fillColor.primary : '#007AFF';

            // 核心拼接辅助函数——完全按照 pen.html 的 addPart，支持向外扩展边界融吞接缝
            const addPart = (slice, partRect, expandX = 0, expandY = 0) => {
                if (partRect.width > 0 && partRect.height > 0) {
                    const clone = slice.clone();
                    if (expandX !== 0 || expandY !== 0) {
                        partRect = partRect.expand(new paper.Size(expandX, expandY));
                    }
                    clone.bounds = partRect;
                    clone.fillColor = fillColor;
                    clone.visible = true;
                    previewGroup.addChild(clone);
                }
            };

            // 1. 先渲染 4 个绝对精确的角落（作为基准底图）
            addPart(this.slices.topLeft, new paper.Rectangle(
                rect.topLeft, new paper.Size(targetCornerSize, targetCornerSize)));
            addPart(this.slices.topRight, new paper.Rectangle(
                rect.topRight.subtract(new paper.Point(targetCornerSize, 0)),
                new paper.Size(targetCornerSize, targetCornerSize)));
            addPart(this.slices.bottomLeft, new paper.Rectangle(
                rect.bottomLeft.subtract(new paper.Point(0, targetCornerSize)),
                new paper.Size(targetCornerSize, targetCornerSize)));
            addPart(this.slices.bottomRight, new paper.Rectangle(
                rect.bottomRight.subtract(new paper.Point(targetCornerSize, targetCornerSize)),
                new paper.Size(targetCornerSize, targetCornerSize)));

            // 重叠像素常数 (1.0 像素足以消除 Canvas 亚像素抗锯齿留白)
            const o = 1.0;

            // 2. 渲染拉伸边缘与中心，并在拉伸方向上外扩 o 像素
            // 顶部 & 底部（水平外扩）
            addPart(this.slices.top, new paper.Rectangle(
                rect.topLeft.add(new paper.Point(targetCornerSize, 0)),
                new paper.Size(targetCenterWidth, targetCornerSize)), o, 0);
            addPart(this.slices.bottom, new paper.Rectangle(
                rect.bottomLeft.add(new paper.Point(targetCornerSize, -targetCornerSize)),
                new paper.Size(targetCenterWidth, targetCornerSize)), o, 0);

            // 左侧 & 右侧（垂直外扩）
            addPart(this.slices.left, new paper.Rectangle(
                rect.topLeft.add(new paper.Point(0, targetCornerSize)),
                new paper.Size(targetCornerSize, targetCenterHeight)), 0, o);
            addPart(this.slices.right, new paper.Rectangle(
                rect.topRight.add(new paper.Point(-targetCornerSize, targetCornerSize)),
                new paper.Size(targetCornerSize, targetCenterHeight)), 0, o);

            // 中心块（全面外扩）
            addPart(this.slices.center, new paper.Rectangle(
                rect.topLeft.add(new paper.Point(targetCornerSize, targetCornerSize)),
                new paper.Size(targetCenterWidth, targetCenterHeight)), o, o);

            this.rect = previewGroup;
        }
    }

    handleMouseUp (event) {
        if (event.event.button > 0 || !this.active) return;

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseUp(event);
            this.isBoundingBoxMode = null;
            return;
        }

        if (this.rect && this.rect.children && this.rect.children.length > 0) {
            // 完全按照 pen.html 的 mouseUp 逻辑：unite() 合并
            const children = [...this.rect.children];

            let unified = children[0].clone();
            for (let i = 1; i < children.length; i++) {
                let prev = unified;
                let nextPart = children[i].clone();
                unified = unified.unite(nextPart);
                prev.remove();
                nextPart.remove();
            }

            this.rect.remove();
            this.rect = null;

            // 应用颜色
            unified.fillColor = this.colorState.fillColor.primary || '#007AFF';
            unified.visible = true;
            paper.project.activeLayer.addChild(unified);
            unified.selected = true;
            this.setSelectedItems();
            this.onUpdateImage();
        } else if (this.rect) {
            this.rect.remove();
            this.rect = null;
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

export default IosCurvatureTool;