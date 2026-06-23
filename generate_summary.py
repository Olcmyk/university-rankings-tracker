#!/usr/bin/env python3
"""
生成数据集统计摘要
"""
import json
import pandas as pd

def load_analysis():
    with open('dataset_analysis.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_summary():
    analysis = load_analysis()

    # 按类别统计
    categories = {
        'QS Rankings': [],
        'THE Rankings': [],
        'THE Key Statistics': [],
        'ARWU/Shanghai': [],
        'CWUR': [],
        'Supplementary Data': []
    }

    for filepath, data in analysis.items():
        if 'error' in data:
            continue

        if 'QS' in filepath or 'qs-world' in filepath:
            categories['QS Rankings'].append({
                'file': filepath,
                'rows': data['rows'],
                'columns': data['columns']
            })
        elif 'THE_' in filepath:
            if 'key_statistics' in filepath:
                categories['THE Key Statistics'].append({
                    'file': filepath,
                    'rows': data['rows'],
                    'columns': data['columns']
                })
            elif 'rankings' in filepath:
                categories['THE Rankings'].append({
                    'file': filepath,
                    'rows': data['rows'],
                    'columns': data['columns']
                })
        elif 'arwu' in filepath.lower() or 'shanghai' in filepath.lower():
            categories['ARWU/Shanghai'].append({
                'file': filepath,
                'rows': data['rows'],
                'columns': data['columns']
            })
        elif 'cwur' in filepath.lower():
            categories['CWUR'].append({
                'file': filepath,
                'rows': data['rows'],
                'columns': data['columns']
            })
        elif 'supplementary' in filepath or 'school_and_country' in filepath:
            categories['Supplementary Data'].append({
                'file': filepath,
                'rows': data['rows'],
                'columns': data['columns']
            })

    # 打印统计
    print("=" * 80)
    print("世界大学排名数据集 - 统计摘要")
    print("=" * 80)
    print()

    total_files = 0
    total_rows = 0

    for category, files in categories.items():
        if not files:
            continue

        print(f"\n【{category}】")
        print(f"  文件数量: {len(files)}")

        rows_sum = sum(f['rows'] for f in files)
        cols_avg = sum(f['columns'] for f in files) / len(files) if files else 0

        print(f"  总记录数: {rows_sum:,}")
        print(f"  平均列数: {cols_avg:.1f}")

        total_files += len(files)
        total_rows += rows_sum

        # 显示前3个文件
        print(f"  示例文件:")
        for f in files[:3]:
            filename = f['file'].split('/')[-1]
            print(f"    - {filename} ({f['rows']:,} 行, {f['columns']} 列)")

    print("\n" + "=" * 80)
    print(f"总计: {total_files} 个文件, {total_rows:,} 条记录")
    print("=" * 80)
    print()

    # 生成年份覆盖表
    print("\n年份覆盖范围:")
    print("-" * 80)
    print(f"{'排名系统':<20} {'起始年份':<15} {'结束年份':<15} {'跨度':<10}")
    print("-" * 80)
    print(f"{'QS':<20} {'2017':<15} {'2027':<15} {'11年':<10}")
    print(f"{'THE':<20} {'2011':<15} {'2026':<15} {'16年':<10}")
    print(f"{'ARWU/上海':<20} {'2003':<15} {'2025':<15} {'23年':<10}")
    print(f"{'CWUR':<20} {'2012':<15} {'2015':<15} {'4年':<10}")
    print("-" * 80)
    print()

if __name__ == '__main__':
    generate_summary()
