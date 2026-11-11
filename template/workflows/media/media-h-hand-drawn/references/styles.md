# 手绘风格导航

本表保留原工作流的 21 个风格入口及常用别名，便于理解已有请求。来源目录为 [threerocks/hand-drawn-styles](https://github.com/threerocks/hand-drawn-styles)，原项目记录的核对日期是 2026-10-10。本仓库没有打包上游完整配方；当前上游是否变化，需要实际打开核实。

“表达方向”是本工作流的选型说明，不是上游配方原文或效果保证。表中“需参考”表示原目录明确依赖参考图；其他条目也可以按用户请求使用参考。

| ID / 风格 | 常见别名 | 表达方向 | 原目录需参考 |
| --- | --- | --- | --- |
| 1 极简黑白线条讲解漫画 | `xkcd`、`stickman`、`minimal-line`、极简线条、火柴人 | 用少量角色、清楚关系和留白解释概念，文字可单独排版 | 否 |
| 2 蜡笔童涂 | `crayon`、`kid-crayon` | 保留蜡笔颗粒、稚拙轮廓与明快色块，适合轻松叙事 | 否 |
| 3 吉卜力风 | `ghibli`、吉卜力 | 以温暖环境、柔和色彩和生活细节组织叙事，先明确具体场景 | 否 |
| 3.1 蜡笔童涂：潦草自画版 | `rawkid`、`kid-scrawl`、`stick-kid`、`family-crayon-card` | 保留个人画痕和家庭场景特征，避免修整成通用商业插画 | 是 |
| 4 小豆人涂鸦信息图 | `bean`、`blob` | 用简化圆润人物、箭头和分组传达流程，先确定信息关系 | 否 |
| 5 MS Paint 烂涂鸦 | `ms-paint`、`bad-doodle`、`ugly` | 有意粗糙的轮廓与有限工具质感，笑点仍需清楚可读 | 否 |
| 6 圆珠笔单线涂鸦 | `scribble`、`pen-scribble`、`ballpoint` | 用单色线条、疏密与排线表现体积，保持主体辨识度 | 否 |
| 7 蜡笔实拍 | `real-crayon`、`crayon-photo` | 将纸张、笔触、光影作为画面的一部分，区分作品与实物拍摄感 | 否 |
| 8 水墨写意 | `ink-wash`、`ink`、`shuimo`、`chinese-painting` | 用墨色浓淡、笔势和留白表达重点，避免把重要信息藏进纹理 | 否 |
| 9 复古像素 | `pixel`、`pixel-art`、`8-bit`、`16-bit` | 用清楚像素网格与有限色板构形，文字和缩放方式要适配像素尺度 | 否 |
| 10 情绪叙事淡彩速写 | `emo-sketch`、`story-sketch`、`watercolor-sketch`、`light-watercolor` | 以人物姿态、淡彩和空间留白表现情绪，适合单幅故事 | 否 |
| 11 二维水彩风格 | `retro-concept`、`mid-century`、`concept-art`、`gouache-concept` | 以平面形状、色块和概念场景为重点，明确偏水彩还是不透明水粉 | 否 |
| 12 暖光童画 | `sunlit-storybook`、`vis-dev`、`storybook-visdev` | 用暖光、儿童视角和环境细节建立场景，亮部不能冲掉关键文字 | 否 |
| 13 北欧纸雕 | `paper-folk`、`papercraft`、`nordic-papercraft`、`quilling` | 用纸层、剪裁边缘与投影组织形体，参考决定具体纸艺语言 | 是 |
| 14 北欧绘本水粉 | `nordic-storybook`、`scandi-gouache`、`scandinavian-storybook`、`soft-gouache` | 简化轮廓、柔和水粉质地与自然色彩，适合有节奏的系列图 | 否 |
| 15 大鼻软偶 | `softnose`、`softnose-vinyl`、`bignose-toy`、`vinyl-toy`、`art-toy` | 用软质玩偶比例和突出鼻部建立角色，保留跨图一致的识别特征 | 否 |
| 16 聚光水粉立绘 | `gouache-spotlight`、`spotlight-gouache`、`character-spotlight` | 以聚光和背景分离突出角色，检查姿态、轮廓与材质层次 | 否 |
| 17 墨线绘本 | `inked-storybook`、`ink-storybook`、`sketch-storybook` | 清楚墨线承载叙事，色彩支持层级，避免线条与小字混成噪声 | 否 |
| 18 暖色扁平绘本 | `warm-flat-storybook`、`flat-storybook`、`geometric-storybook`、`warm-flat` | 暖色几何形与平面构图，靠比例和位置而不是复杂纹理表达重点 | 否 |
| 19 圆头红线极简童画 | `roundhead-redline`、`redline-roundhead`、`graphite-redline` | 圆头角色与特征红线构成识别语言，参考决定角色与笔迹 | 是 |
| 20 暖黄墨线情绪小剧场 | `warm-yellow-ink-story`、`yellow-ink-story`、`mustard-ink-story` | 暖黄环境、墨线角色与表情动作组成小场景，保持情绪连续 | 是 |

## 怎么选

先选信息任务，再选视觉语言：解释关系要先保真；情绪叙事要先让姿态与场景可理解；封面要在目标尺寸仍能识别主题。相邻风格可以比较，但无需向每个用户展示全部 21 项。

用户给出的别名定位到相应条目后，核对其真正想保留的特征。名称相同但参考不同可能代表不同效果。精确复用上游配方时继续读 [制作与配方复用](production.md)，不能仅靠这张表冒称已取得完整配方。
