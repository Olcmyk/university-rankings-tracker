#!/usr/bin/env python3
"""
分析所有大学排名数据集的结构
"""
import pandas as pd
import os
from pathlib import Path
import json

def analyze_csv(filepath):
    """分析CSV文件"""
    try:
        df = pd.read_csv(filepath, encoding='utf-8')
        return {
            'rows': len(df),
            'columns': len(df.columns),
            'column_names': list(df.columns),
            'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
            'missing_values': df.isnull().sum().to_dict(),
            'sample_data': df.head(2).to_dict('records') if len(df) > 0 else []
        }
    except Exception as e:
        try:
            df = pd.read_csv(filepath, encoding='latin-1')
            return {
                'rows': len(df),
                'columns': len(df.columns),
                'column_names': list(df.columns),
                'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
                'missing_values': df.isnull().sum().to_dict(),
                'sample_data': df.head(2).to_dict('records') if len(df) > 0 else []
            }
        except Exception as e2:
            return {'error': str(e2)}

def analyze_excel(filepath):
    """分析Excel文件"""
    try:
        df = pd.read_excel(filepath)
        return {
            'rows': len(df),
            'columns': len(df.columns),
            'column_names': list(df.columns),
            'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
            'missing_values': df.isnull().sum().to_dict(),
            'sample_data': df.head(2).to_dict('records') if len(df) > 0 else []
        }
    except Exception as e:
        return {'error': str(e)}

def main():
    results = {}

    # 查找所有数据文件
    for ext in ['*.csv', '*.xlsx', '*.xls']:
        for filepath in Path('.').rglob(ext):
            rel_path = str(filepath)
            print(f"Analyzing: {rel_path}")

            if filepath.suffix.lower() == '.csv':
                results[rel_path] = analyze_csv(filepath)
            else:
                results[rel_path] = analyze_excel(filepath)

    # 保存结果
    with open('dataset_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n分析完成！共分析了 {len(results)} 个文件")
    print("结果已保存到 dataset_analysis.json")

if __name__ == '__main__':
    main()
