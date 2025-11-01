# TODO LIST: 重写圆角工具

- [x] 分析现有圆角工具的实现
- [x] 分析现有长方形工具的实现  
- [x] 对比两者逻辑差异
- [x] 重写圆角工具以使用和长方形工具相同的逻辑
- [x] 修复颜色和边框显示问题
- [x] 修复 paper 导入错误

## 完成的重构内容：

### ✅ 已完成的重构：
1. **导入相同的工具和函数**：
   - `BoundingBoxTool` 和 `NudgeTool` 处理选择和键盘导航
   - `styleShape` 和 `clearSelection` 处理样式和选择
   - `getSquareDimensions` 处理正方形约束
   - `Modes` 导入用于模式识别

2. **统一的工具架构**：
   - 使用 `TOLERANCE` 常量替代自定义的 `minDistance`
   - 实现相同的 `getHitOptions()` 方法
   - 实现相同的 `onSelectionChanged()` 和 `setColorState()` 接口

3. **简化的状态管理**：
   - 移除了独立的手动悬停处理逻辑
   - 移除了自定义参考线系统
   - 使用 bounding box tool 统一处理选择和变换

4. **保持核心功能**：
   - 保留了圆角矩形创建逻辑
   - 保留了圆角半径计算逻辑
   - 集成了样式应用逻辑

### 🛠️ 修复的问题：

#### 1. 颜色和边框显示问题：
- **问题**：拖拽时及拖拽结束时颜色和边框都是透明的
- **原因**：圆角工具缺少颜色状态管理
- **解决**：
  - 在容器中集成 `colorState` 和 `selectedItems` 状态管理
  - 确保调用 `tool.setColorState()` 和 `tool.onSelectionChanged()`
  - 使用与矩形工具相同的颜色验证逻辑

#### 2. Paper 导入错误：
- **问题**：`Uncaught ReferenceError: paper is not defined`
- **原因**：rounded-rect-mode.jsx 文件中缺少 `paper` 导入，但在 PropTypes 中使用了 `paper.Item`
- **解决**：
  - 添加 `import paper from '@turbowarp/paper';`
  - 添加所有必要的导入：GradientTypes, changeFillColor, clearFillGradient, DEFAULT_COLOR, changeStrokeColor, clearStrokeGradient, setCursor
  - 在 mapDispatchToProps 中添加所有必要的 dispatch 函数
  - 在 PropTypes 中包含所有必要的 prop types

### 📝 重构成果：
- **代码量减少**：从 ~240 行减少到 ~120 行
- **架构统一**：现在使用与矩形工具相同的架构
- **功能一致**：支持所有矩形工具的功能（选择、变换、键盘导航）
- **可维护性提升**：共享的代码更容易维护和测试
- **颜色显示正常**：现在圆角工具能正确显示颜色和边框
- **导入错误已修复**：解决了 paper 未定义的错误

✅ **任务完全完成**：圆角工具现在完全集成到与矩形工具相同的架构中，所有问题都已解决。
