#!/usr/bin/env python3
"""
自动生成 Chrome 扩展所需的图标文件
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """创建指定尺寸的图标"""
    # 创建图像，使用渐变背景
    img = Image.new('RGB', (size, size), color='white')
    draw = ImageDraw.Draw(img)

    # 绘制渐变背景（从深灰到蓝灰）
    for y in range(size):
        # 计算渐变颜色
        ratio = y / size
        r = int(15 + (44 - 15) * ratio)
        g = int(32 + (83 - 32) * ratio)
        b = int(39 + (100 - 39) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # 绘制边框装饰
    border_width = max(1, int(size * 0.015))
    border_margin = int(size * 0.05)
    draw.rectangle(
        [border_margin, border_margin, size - border_margin, size - border_margin],
        outline=(255, 255, 255, 77),
        width=border_width
    )

    # 绘制文字内容 "A→中"
    # 尝试使用系统字体
    try:
        # Windows 系统字体
        font_size_large = int(size * 0.31)
        font_size_medium = int(size * 0.27)
        font_size_arrow = int(size * 0.23)

        font_latin = ImageFont.truetype("arial.ttf", font_size_large)
        font_chinese = ImageFont.truetype("msyh.ttf", font_size_medium)  # 微软雅黑
        font_arrow = ImageFont.truetype("arial.ttf", font_size_arrow)
    except:
        # 如果找不到字体，使用默认字体
        font_latin = ImageFont.load_default()
        font_chinese = ImageFont.load_default()
        font_arrow = ImageFont.load_default()

    # 绘制 "A"
    draw.text((size * 0.28, size * 0.4), 'A', fill='white', font=font_latin, anchor='mm')

    # 绘制箭头 "→"
    draw.text((size * 0.5, size * 0.5), '→', fill='white', font=font_arrow, anchor='mm')

    # 绘制 "中"
    draw.text((size * 0.72, size * 0.6), '中', fill='white', font=font_chinese, anchor='mm')

    # 保存图像
    img.save(filename, 'PNG')
    print(f"[OK] 生成成功: {filename} ({size}x{size})")

def main():
    # 获取脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    print("开始生成 Chrome 扩展图标...\n")

    # 生成三个尺寸的图标
    sizes = [
        (16, 'icon16.png'),
        (48, 'icon48.png'),
        (128, 'icon128.png')
    ]

    for size, filename in sizes:
        create_icon(size, filename)

    print("\n所有图标生成完成！")
    print("图标文件已保存到当前目录")

if __name__ == '__main__':
    main()
