# 三大排名系统数据合并分析报告

## 目标
将 QS、THE、ARWU 三大世界大学排名系统的数据合并成一个统一的超级数据集。

---

## 1. 关键对齐字段分析

### 1.1 大学名称字段（最关键！）

| 排名系统 | 字段名 | 示例 | 问题 |
|---------|--------|------|------|
| **QS** | `institution` / `Institution Name` / `Name` / `university` | "Massachusetts Institute of Technology (MIT) " | ⚠️ 不同年份使用不同字段名 |
| **THE** | `Name` | "Harvard University" | ⚠️ 可能包含特殊字符 |
| **ARWU** | `name` | "Harvard University" | ⚠️ 命名方式可能不同 |

**主要问题：**
- ❌ **字段名不统一**：QS在不同年份使用 `institution` / `Institution Name` / `Name` / `university`
- ❌ **大学名称标准化问题**：
  - MIT 可能写作：`Massachusetts Institute of Technology (MIT)`, `MIT`, `Massachusetts Institute of Technology`
  - 清华大学可能写作：`Tsinghua University`, `Tsinghua Univ.`, `清华大学`
  - 牛津大学可能写作：`University of Oxford`, `Oxford University`
- ❌ **空格和标点符号**：QS的MIT名称后有空格 `"Massachusetts Institute of Technology (MIT) "`

### 1.2 国家/地区字段

| 排名系统 | 字段名 | 格式 | 示例 |
|---------|--------|------|------|
| **QS** | `location code` / `Country Code` / `Location` / `country` | 国家代码 + 全名 | `US` / `United States` |
| **THE** | 无独立国家字段 | - | - |
| **ARWU** | `region` / `region_code` / `continent` | 全名 + 代码 + 大洲 | `USA` / `United States of America` / `Americas` |

**主要问题：**
- ❌ **THE缺少国家字段**：需要从其他来源补充
- ❌ **国家代码不统一**：QS用 `US`，ARWU用 `USA`
- ❌ **国家名称不统一**：`United States` vs `United States of America`

### 1.3 年份字段

| 排名系统 | 字段名 | 格式 | 时间范围 |
|---------|--------|------|---------|
| **QS** | `year` / 文件名中的年份 | 整数 | 2017-2027 |
| **THE** | `year` | 整数 | 2011-2026 |
| **ARWU** | `year` | 整数 | 2003-2025 |

**主要问题：**
- ⚠️ **QS部分文件没有year列**：需要从文件名提取
- ⚠️ **时间覆盖不完全重叠**：
  - 三者共同覆盖期：**2017-2025年**（9年）
  - QS独有：2026-2027年
  - THE独有：2011-2016年
  - ARWU独有：2003-2016年

### 1.4 排名字段

| 排名系统 | 字段名 | 格式 | 问题 |
|---------|--------|------|------|
| **QS** | `Rank` / `2025 Rank` / `rank_display` | 数字或范围 | "1", "101-200" |
| **THE** | `Rank` | 数字或范围 | "1", "201-250" |
| **ARWU** | `rank` | 数字或范围 | "1", "101-150" |

**主要问题：**
- ❌ **排名格式不统一**：有些是数字（1），有些是范围（"101-200"）
- ❌ **范围表示方式不同**：需要标准化处理

---

## 2. 数据结构差异

### 2.1 QS数据问题

**问题1：不同年份的列名完全不同**

```
2023年: institution, location code, location, ar score, ar rank, ...
2024年: Institution Name, Country Code, Country, Academic Reputation Score, ...
2025年: Institution Name, Location, Location Full, Academic Reputation, ...
2026年: Name, Country/Territory, Region, Academic Reputation SCORE, ...
2017-2022: university, year, country, city, region, ...
```

**问题2：2027年Excel文件格式异常**
- 列名全是 `Unnamed: N`，需要手动修复

**问题3：评分指标字段名不统一**
```
Academic Reputation / Academic Reputation Score / Academic Reputation SCORE / ar score
```

### 2.2 THE数据问题

**问题1：数据分散在两类文件中**
- `THE_YYYY_rankings.csv`：包含排名和总分
- `THE_YYYY_key_statistics.csv`：包含学生数、师生比等统计数据
- 需要通过 `(year, Name)` 进行关联

**问题2：不同年份列名可能变化**
- 早期年份（2011-2022）：`teaching`, `international`, `research`, `citations`, `income`
- 近期年份（2023+）：`Teaching`, `Research Environment`, `Research Quality`, `Industry`

**问题3：缺少国家信息**
- THE数据中没有国家字段，需要从补充数据 `school_and_country_table.csv` 中关联

### 2.3 ARWU数据问题

**问题1：评分指标与其他系统完全不同**
- ARWU: Alumni, Award, HiCi, N&S, PUB, PCP
- QS: Academic Reputation, Employer Reputation, Citations per Faculty...
- THE: Teaching, Research, Citations, International, Industry

**问题2：地区编码不标准**
- `region_code` 可能与 QS/THE 的国家代码不匹配

---

## 3. 缺失的关键数据

### ❌ 3.1 大学标识符（University ID）

**当前状态：** 没有统一的大学唯一标识符

**问题：**
- 无法精确匹配同一所大学在不同排名系统中的记录
- 例如：`MIT` vs `Massachusetts Institute of Technology` vs `Massachusetts Institute of Technology (MIT) `

**需要补充：**
- 创建一个 **大学名称标准化映射表**（University Mapping Table）
- 包含字段：
  - `university_id`：唯一标识符
  - `standard_name`：标准名称
  - `qs_name_variants`：QS中的所有变体
  - `the_name_variants`：THE中的所有变体
  - `arwu_name_variants`：ARWU中的所有变体
  - `aliases`：其他别名

### ❌ 3.2 国家/地区标准化表

**当前状态：** 国家代码和名称不统一

**需要补充：**
- 创建 **国家标准化映射表**
- 包含字段：
  - `country_id`：ISO 3166标准国家代码
  - `country_name_en`：英文标准名称
  - `country_name_cn`：中文名称
  - `qs_code`：QS使用的代码（US）
  - `arwu_code`：ARWU使用的代码（USA）
  - `continent`：大洲

### ❌ 3.3 THE的国家信息

**当前状态：** THE数据中缺少国家字段

**解决方案：**
- 使用 `3rankings/school_and_country_table.csv` 进行关联
- 但这个表只有 818 条记录，可能覆盖不全
- 需要手动补充缺失的大学-国家映射

### ❌ 3.4 QS 2027年数据需要清洗

**当前状态：** Excel文件列名全是 `Unnamed`

**需要操作：**
- 手动检查并修复2027年数据的列名
- 可能需要重新从原始来源下载

---

## 4. 时间覆盖对齐分析

### 完整时间线对比

```
年份    QS    THE   ARWU   说明
2003    ❌    ❌    ✅     只有ARWU
2004    ❌    ❌    ✅     只有ARWU
...
2010    ❌    ❌    ✅     只有ARWU
2011    ❌    ✅    ✅     THE开始
...
2016    ❌    ✅    ✅     THE + ARWU
2017    ✅    ✅    ✅     三者开始重叠 ⭐
2018    ✅    ✅    ✅     
2019    ✅    ✅    ✅     
2020    ✅    ✅    ✅     
2021    ✅    ✅    ✅     
2022    ✅    ✅    ✅     
2023    ✅    ✅    ✅     
2024    ✅    ✅    ✅     
2025    ✅    ✅    ✅     三者最后重叠年 ⭐
2026    ✅    ✅    ❌     QS + THE
2027    ✅    ❌    ❌     只有QS
```

**关键发现：**
- ✅ **2017-2025年**：三个排名系统都有数据（9年，最适合对比分析）
- ⚠️ 2011-2016年：只有 THE + ARWU
- ⚠️ 2003-2010年：只有 ARWU
- ⚠️ 2026-2027年：缺少ARWU

---

## 5. 评分标准不可比问题

### 三大系统评分体系对比

| 维度 | QS | THE | ARWU |
|------|-----|-----|------|
| **总分范围** | 0-100 | 0-100 | 0-100 |
| **学术声誉** | Academic Reputation (30%) | Teaching (30%) | Alumni (10%) + Award (20%) |
| **研究产出** | Citations per Faculty (20%) | Research (30%) + Citations (30%) | HiCi (20%) + N&S (20%) + PUB (20%) |
| **国际化** | International Faculty/Students (20%) | International (7.5%) | ❌ 无此维度 |
| **就业** | Employer Reputation (15%) + Employment Outcomes (5%) | Industry Income (2.5%) | ❌ 无此维度 |
| **师生比** | Faculty Student (10%) | ✅ 包含在Teaching中 | PCP (10%) |

**关键问题：**
- ❌ **评分维度完全不同**：无法直接对比
- ❌ **权重不同**：相同维度在不同系统中权重不同
- ❌ **ARWU偏重学术研究**，缺少国际化和就业维度
- ❌ **QS更关注声誉调查**，THE更关注教学研究平衡，ARWU最客观

---

## 6. 数据质量问题

### 6.1 缺失值分布

根据 `dataset_analysis.json`：

**QS 2025年：**
- `International Faculty`: 100个缺失值
- `International Students`: 58个缺失值
- `Sustainability`: 19个缺失值

**THE：**
- 早期年份（2011-2015）数据较少（400-800所大学）
- 近期年份（2023-2026）数据较多（2300-3100所大学）

**ARWU：**
- 只排名前500-1000所大学
- 排名范围较窄

### 6.2 数据一致性问题

- 同一所大学在不同年份可能改名
- 合并、拆分的大学难以追踪
- 不同排名系统对同一大学的认定可能不同（分校区问题）

---

## 7. 合并方案建议

### 方案A：完整合并（推荐用于深度分析）

**目标：** 保留所有原始数据，通过标准化字段关联

**步骤：**
1. ✅ 创建大学名称标准化表
2. ✅ 创建国家标准化表
3. ✅ 标准化所有QS文件的列名
4. ✅ 合并THE的rankings和key_statistics
5. ✅ 补充THE的国家信息
6. ✅ 创建统一的宽表结构

**最终表结构：**
```
university_id, standard_name, country, year,
qs_rank, qs_score, qs_academic_reputation, qs_employer_reputation, ...,
the_rank, the_score, the_teaching, the_research, ...,
arwu_rank, arwu_score, arwu_alumni, arwu_award, ...
```

**优点：**
- 保留所有原始信息
- 可以进行跨系统对比
- 支持任意维度分析

**缺点：**
- 数据表会非常宽（100+列）
- 需要大量数据清洗工作
- 缺失值较多

### 方案B：精简合并（推荐用于快速分析）

**目标：** 只保留核心字段，聚焦排名对比

**步骤：**
1. ✅ 只提取：大学名、国家、年份、排名、总分
2. ✅ 转换为长格式（Long Format）
3. ✅ 添加 `ranking_system` 列标识来源

**最终表结构：**
```
university_id, standard_name, country, year, ranking_system, rank, overall_score
```

**示例数据：**
```
MIT, United States, 2023, QS, 1, 100.0
MIT, United States, 2023, THE, 5, 95.8
MIT, United States, 2023, ARWU, 3, 89.2
```

**优点：**
- 结构简单，易于分析
- 清洗工作量小
- 适合排名趋势对比

**缺点：**
- 丢失详细指标信息
- 无法分析具体维度

### 方案C：分层合并（推荐用于学术研究）

**目标：** 创建多个关联表

**表1：核心信息表**
```
university_id, standard_name, country, continent, founded_year
```

**表2：年度排名表**
```
university_id, year, ranking_system, rank, overall_score
```

**表3：QS详细指标表**
```
university_id, year, academic_reputation, employer_reputation, ...
```

**表4：THE详细指标表**
```
university_id, year, teaching, research, citations, ...
```

**表5：ARWU详细指标表**
```
university_id, year, alumni, award, hici, ...
```

**优点：**
- 数据库范式规范
- 灵活查询
- 存储效率高

**缺点：**
- 需要SQL知识
- 查询相对复杂

---

## 8. 立即需要做的工作

### 🔥 优先级1（必须完成）

1. **创建大学名称映射表**
   ```python
   # 从所有数据源中提取唯一的大学名称
   # 手动/半自动匹配相同大学的不同名称变体
   # 分配唯一ID
   ```

2. **修复QS 2027年数据**
   ```python
   # 重新读取Excel，跳过标题行
   # 正确设置列名
   ```

3. **标准化QS数据的列名**
   ```python
   # 将所有年份的QS数据统一字段名
   # institution/Institution Name/Name/university -> university_name
   # 统一评分字段名
   ```

### 🔸 优先级2（建议完成）

4. **补充THE的国家信息**
   ```python
   # 使用 school_and_country_table.csv
   # 手动补充缺失的映射
   ```

5. **创建国家标准化表**
   ```python
   # 统一国家代码和名称
   ```

6. **处理排名范围**
   ```python
   # "101-200" -> rank_min=101, rank_max=200
   # "1" -> rank_min=1, rank_max=1
   ```

### 🔹 优先级3（可选）

7. **数据质量检查**
   - 检查重复记录
   - 检查异常值
   - 统计缺失率

8. **创建数据血缘文档**
   - 记录每个字段的来源
   - 记录转换规则

---

## 9. 工具和脚本需求

### 需要创建的脚本：

1. **`create_university_mapping.py`**
   - 提取所有唯一大学名称
   - 使用模糊匹配算法初步分组
   - 生成待人工审核的映射表

2. **`standardize_qs_data.py`**
   - 统一QS所有年份的列名
   - 标准化数据格式
   - 输出统一的QS数据集

3. **`merge_the_data.py`**
   - 合并rankings和key_statistics
   - 补充国家信息
   - 输出统一的THE数据集

4. **`standardize_arwu_data.py`**
   - 确保ARWU数据格式一致
   - 输出统一的ARWU数据集

5. **`merge_all_rankings.py`**
   - 使用映射表合并三个数据集
   - 生成最终的超级数据集

### 推荐使用的Python库：

```python
pandas                # 数据处理
numpy                 # 数值计算
fuzzywuzzy           # 模糊字符串匹配（大学名称匹配）
python-Levenshtein   # 提升fuzzywuzzy速度
pycountry            # 国家标准化
openpyxl             # Excel文件处理
```

---

## 10. 总结

### ✅ 你已经拥有的：

- 三大排名系统的原始数据
- 较完整的时间覆盖（2003-2027）
- 补充数据（国家映射表）

### ❌ 你缺少的：

1. **大学名称标准化映射表**（最关键！）
2. **国家标准化映射表**
3. **THE的完整国家信息**
4. **统一的数据结构和列名**
5. **QS 2027年数据需要修复**

### 🎯 推荐行动方案：

**阶段1：数据清洗（1-2天）**
1. 修复QS 2027年数据
2. 统一QS所有年份的列名
3. 合并THE的rankings和key_statistics

**阶段2：创建映射表（2-3天）**
1. 提取所有大学名称
2. 使用自动化+人工审核创建映射表
3. 创建国家标准化表

**阶段3：数据合并（1天）**
1. 使用映射表合并数据
2. 处理缺失值
3. 数据质量检查

**阶段4：验证和文档（1天）**
1. 抽样验证合并结果
2. 生成数据字典
3. 编写使用文档

**总计：5-7天工作量**

---

## 附录：快速诊断代码

```python
import pandas as pd
import glob

# 1. 检查大学名称变体
def check_university_names():
    qs_names = set()
    the_names = set()
    arwu_names = set()
    
    # 从各个数据源提取大学名称
    # ... (代码略)
    
    print(f"QS unique universities: {len(qs_names)}")
    print(f"THE unique universities: {len(the_names)}")
    print(f"ARWU unique universities: {len(arwu_names)}")
    
    # 查找可能的匹配
    # ... (代码略)

# 2. 检查年份覆盖
def check_year_coverage():
    # ... (代码略)
    pass

# 3. 检查列名差异
def check_column_differences():
    # ... (代码略)
    pass
```

你想从哪个阶段开始？我可以帮你：
1. 创建大学名称映射表
2. 修复和标准化QS数据
3. 直接尝试简单合并看看效果
