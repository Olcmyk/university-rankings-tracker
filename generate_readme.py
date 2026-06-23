#!/usr/bin/env python3
"""
生成数据集README文档
"""
import json
import pandas as pd
from pathlib import Path
from datetime import datetime

def load_analysis():
    with open('dataset_analysis.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_readme(analysis):
    readme = []

    # 标题
    readme.append("# 世界大学排名数据集 (World University Rankings Dataset)")
    readme.append("")
    readme.append(f"**生成日期**: {datetime.now().strftime('%Y-%m-%d')}")
    readme.append("")
    readme.append("本仓库包含三大权威世界大学排名系统的历史数据：")
    readme.append("")
    readme.append("- **QS World University Rankings** (2017-2027)")
    readme.append("- **Times Higher Education (THE) World University Rankings** (2011-2026)")
    readme.append("- **Academic Ranking of World Universities (ARWU/上海排名)** (2003-2025)")
    readme.append("- **Center for World University Rankings (CWUR)** (2012-2015)")
    readme.append("")
    readme.append("---")
    readme.append("")

    # 目录
    readme.append("## 目录 (Table of Contents)")
    readme.append("")
    readme.append("1. [数据概览](#数据概览)")
    readme.append("2. [QS排名数据](#qs排名数据)")
    readme.append("3. [THE排名数据](#the排名数据)")
    readme.append("4. [ARWU/上海排名数据](#arwu上海排名数据)")
    readme.append("5. [CWUR排名数据](#cwur排名数据)")
    readme.append("6. [补充数据](#补充数据)")
    readme.append("")
    readme.append("---")
    readme.append("")

    # 数据概览
    readme.append("## 数据概览")
    readme.append("")
    readme.append("### 数据覆盖范围")
    readme.append("")
    readme.append("| 排名系统 | 年份范围 | 文件数量 | 总记录数 |")
    readme.append("|---------|---------|---------|---------|")

    # 统计各类数据
    qs_files = [k for k in analysis.keys() if 'QS' in k or 'qs-world' in k]
    the_files = [k for k in analysis.keys() if 'THE_' in k]
    arwu_files = [k for k in analysis.keys() if 'arwu' in k.lower()]
    cwur_files = [k for k in analysis.keys() if 'cwur' in k.lower()]

    qs_rows = sum(analysis[f]['rows'] for f in qs_files if 'error' not in analysis[f])
    the_rows = sum(analysis[f]['rows'] for f in the_files if 'error' not in analysis[f])
    arwu_rows = sum(analysis[f]['rows'] for f in arwu_files if 'error' not in analysis[f])
    cwur_rows = sum(analysis[f]['rows'] for f in cwur_files if 'error' not in analysis[f])

    readme.append(f"| QS | 2017-2027 | {len(qs_files)} | {qs_rows:,} |")
    readme.append(f"| THE | 2011-2026 | {len(the_files)} | {the_rows:,} |")
    readme.append(f"| ARWU/上海 | 2003-2025 | {len(arwu_files)} | {arwu_rows:,} |")
    readme.append(f"| CWUR | 2012-2015 | {len(cwur_files)} | {cwur_rows:,} |")
    readme.append("")
    readme.append(f"**总计**: {len(analysis)} 个数据文件，约 {qs_rows + the_rows + arwu_rows + cwur_rows:,} 条记录")
    readme.append("")
    readme.append("---")
    readme.append("")

    # QS排名详细信息
    readme.append("## QS排名数据")
    readme.append("")
    readme.append("QS世界大学排名由英国教育组织Quacquarelli Symonds发布，是全球最具影响力的大学排名之一。")
    readme.append("")

    for filepath in sorted(qs_files):
        data = analysis[filepath]
        if 'error' in data:
            continue

        readme.append(f"### `{filepath}`")
        readme.append("")
        readme.append(f"- **行数**: {data['rows']:,}")
        readme.append(f"- **列数**: {data['columns']}")
        readme.append(f"- **列名**:")
        readme.append("")
        for col in data['column_names']:
            readme.append(f"  - `{col}`")
        readme.append("")

    readme.append("---")
    readme.append("")

    # THE排名详细信息
    readme.append("## THE排名数据")
    readme.append("")
    readme.append("泰晤士高等教育世界大学排名（Times Higher Education World University Rankings）是全球最权威的大学排名之一。")
    readme.append("")
    readme.append("本数据集包含2011-2026年的完整排名数据，每年分为两个文件：")
    readme.append("")
    readme.append("- `THE_YYYY_rankings.csv`: 该年度的排名列表")
    readme.append("- `THE_YYYY_key_statistics.csv`: 该年度的详细统计指标")
    readme.append("")

    # 按年份分组
    the_years = {}
    for filepath in the_files:
        year = filepath.split('THE_')[1].split('_')[0]
        if year not in the_years:
            the_years[year] = []
        the_years[year].append(filepath)

    readme.append("### 年度数据文件")
    readme.append("")

    for year in sorted(the_years.keys()):
        files = sorted(the_years[year])
        readme.append(f"#### {year}年")
        readme.append("")
        for filepath in files:
            data = analysis[filepath]
            if 'error' in data:
                continue
            file_type = "排名数据" if "rankings" in filepath else "统计指标"
            readme.append(f"**`{filepath}`** ({file_type})")
            readme.append(f"- 行数: {data['rows']:,}")
            readme.append(f"- 列数: {data['columns']}")
            readme.append(f"- 列名: {', '.join([f'`{col}`' for col in data['column_names'][:8]])}")
            if len(data['column_names']) > 8:
                readme.append(f"  ... (共{data['columns']}列)")
            readme.append("")

    readme.append("---")
    readme.append("")

    # ARWU排名详细信息
    readme.append("## ARWU/上海排名数据")
    readme.append("")
    readme.append("世界大学学术排名（Academic Ranking of World Universities，简称ARWU），俗称上海排名，由上海交通大学世界一流大学研究中心发布。")
    readme.append("")

    for filepath in sorted(arwu_files):
        data = analysis[filepath]
        if 'error' in data:
            continue

        readme.append(f"### `{filepath}`")
        readme.append("")
        readme.append(f"- **行数**: {data['rows']:,}")
        readme.append(f"- **列数**: {data['columns']}")
        readme.append(f"- **年份范围**: 2003-2025")
        readme.append(f"- **列名**:")
        readme.append("")
        for col in data['column_names']:
            readme.append(f"  - `{col}`")
        readme.append("")

    readme.append("---")
    readme.append("")

    # CWUR排名详细信息
    readme.append("## CWUR排名数据")
    readme.append("")
    readme.append("世界大学排名中心（Center for World University Rankings）排名数据。")
    readme.append("")

    for filepath in sorted(cwur_files):
        data = analysis[filepath]
        if 'error' in data:
            continue
        if 'cwurData.csv' in filepath:
            readme.append(f"### `{filepath}`")
            readme.append("")
            readme.append(f"- **行数**: {data['rows']:,}")
            readme.append(f"- **列数**: {data['columns']}")
            readme.append(f"- **年份范围**: 2012-2015")
            readme.append(f"- **列名**:")
            readme.append("")
            for col in data['column_names']:
                readme.append(f"  - `{col}`")
            readme.append("")

    readme.append("---")
    readme.append("")

    # 补充数据
    readme.append("## 补充数据")
    readme.append("")
    readme.append("除了主要排名数据外，还包含以下补充数据：")
    readme.append("")

    supp_files = [k for k in analysis.keys() if 'supplementary' in k or 'school_and_country' in k]
    for filepath in sorted(supp_files):
        data = analysis[filepath]
        if 'error' in data:
            continue

        readme.append(f"### `{filepath}`")
        readme.append("")
        readme.append(f"- **行数**: {data['rows']:,}")
        readme.append(f"- **列数**: {data['columns']}")
        readme.append(f"- **列名**: {', '.join([f'`{col}`' for col in data['column_names'][:10]])}")
        if len(data['column_names']) > 10:
            readme.append(f" ... (共{data['columns']}列)")
        readme.append("")

    readme.append("---")
    readme.append("")

    # 使用说明
    readme.append("## 使用说明")
    readme.append("")
    readme.append("### 数据加载示例")
    readme.append("")
    readme.append("```python")
    readme.append("import pandas as pd")
    readme.append("")
    readme.append("# 加载QS 2025年排名")
    readme.append("qs_2025 = pd.read_csv('qs-world-rankings-2025.csv')")
    readme.append("")
    readme.append("# 加载THE 2026年排名")
    readme.append("the_2026 = pd.read_csv('times2011-2026/outputs/csv/THE_2026_rankings.csv')")
    readme.append("")
    readme.append("# 加载ARWU所有年份数据")
    readme.append("arwu_all = pd.read_csv('arwu_all_years_combined_2003-2025.csv')")
    readme.append("```")
    readme.append("")

    # 数据字段说明
    readme.append("### 主要指标说明")
    readme.append("")
    readme.append("#### QS排名指标")
    readme.append("")
    readme.append("- `Academic Reputation`: 学术声誉")
    readme.append("- `Employer Reputation`: 雇主声誉")
    readme.append("- `Faculty Student`: 师生比")
    readme.append("- `Citations per Faculty`: 教师平均引用率")
    readme.append("- `International Faculty`: 国际教师比例")
    readme.append("- `International Students`: 国际学生比例")
    readme.append("- `International Research Network`: 国际研究网络")
    readme.append("- `Employment Outcomes`: 就业成果")
    readme.append("- `Sustainability`: 可持续发展")
    readme.append("")

    readme.append("#### THE排名指标")
    readme.append("")
    readme.append("- `teaching`: 教学质量")
    readme.append("- `research`: 研究质量")
    readme.append("- `citations`: 论文引用")
    readme.append("- `international`: 国际视野")
    readme.append("- `income`: 产业收入")
    readme.append("")

    readme.append("#### ARWU排名指标")
    readme.append("")
    readme.append("- `alumni`: 校友获奖")
    readme.append("- `award`: 教师获奖")
    readme.append("- `hici`: 高被引科学家")
    readme.append("- `ns`: Nature/Science论文")
    readme.append("- `pub`: 国际论文")
    readme.append("- `pcp`: 师均表现")
    readme.append("")

    readme.append("---")
    readme.append("")

    # 注意事项
    readme.append("## 注意事项")
    readme.append("")
    readme.append("1. 不同排名系统的评价标准和方法不同，排名结果可能存在差异")
    readme.append("2. 部分年份的数据可能存在缺失值，使用时请注意处理")
    readme.append("3. 排名数据仅供参考，不应作为选择大学的唯一依据")
    readme.append("4. 数据来源于公开发布的排名结果，请遵守相应的使用条款")
    readme.append("")

    readme.append("---")
    readme.append("")

    readme.append("## 许可证")
    readme.append("")
    readme.append("本数据集仅供学术研究和教育用途。请遵守原始数据来源的版权和使用条款。")
    readme.append("")

    readme.append("## 更新日志")
    readme.append("")
    readme.append(f"- **{datetime.now().strftime('%Y-%m-%d')}**: 初始版本，包含2003-2027年的完整数据")
    readme.append("")

    return '\n'.join(readme)

def main():
    analysis = load_analysis()
    readme_content = generate_readme(analysis)

    with open('README.md', 'w', encoding='utf-8') as f:
        f.write(readme_content)

    print("README.md 生成成功！")
    print(f"共包含 {len(analysis)} 个数据文件的详细信息")

if __name__ == '__main__':
    main()
