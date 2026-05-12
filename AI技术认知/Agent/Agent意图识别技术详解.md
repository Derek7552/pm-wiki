# Agent意图识别技术详解

> Agent系统中意图识别的实现原理、技术方案与最佳实践

## 目录

- [一、什么是意图识别](#一什么是意图识别)
- [二、基于LLM的意图识别](#二基于llm的意图识别)
- [三、意图识别的核心机制](#三意图识别的核心机制)
- [四、复杂场景处理](#四复杂场景处理)
- [五、传统方法对比](#五传统方法对比)
- [六、实际落地关键点](#六实际落地关键点)
- [七、智谱Agent平台实现](#七智谱agent平台实现)
- [八、常见面试问题](#八常见面试问题)

---

## 一、什么是意图识别

意图识别（Intent Recognition）是Agent系统理解用户需求的第一步，决定了Agent应该执行什么操作。

**核心任务：**
- 理解用户输入的真实意图
- 将自然语言映射到具体的操作/工具
- 提取执行操作所需的参数

**基本流程：**
```
用户输入 → 意图识别 → 参数提取 → 执行操作 → 返回结果
```

**示例：**
- 用户输入："明天北京天气怎么样"
- 识别意图：查询天气
- 提取参数：城市=北京，时间=明天
- 执行操作：调用天气API
- 返回结果："明天北京晴，15-25℃"

---

## 二、基于LLM的意图识别

现代Agent系统主要依赖大语言模型（LLM）进行意图识别，这是目前的主流方式。

### 2.1 Prompt工程方式

通过精心设计的Prompt让LLM理解可用的操作并判断意图。

**实现示例：**
```python
system_prompt = """
你是一个智能助手，可以执行以下操作：

1. 查询天气 - 当用户询问天气、气温、是否下雨等问题时
2. 设置提醒 - 当用户要求设置提醒、闹钟、日程时
3. 搜索信息 - 当用户需要查找资料、搜索内容时
4. 计算数学 - 当用户需要进行数学计算时
5. 普通对话 - 其他日常对话场景

请根据用户输入判断意图，并按以下JSON格式输出：
{
  "intent": "意图类型",
  "parameters": {
    "参数名": "参数值"
  },
  "confidence": 0.95
}
"""

# 用户输入
user_input = "明天北京会下雨吗？"

# LLM输出
{
  "intent": "查询天气",
  "parameters": {
    "city": "北京",
    "date": "明天",
    "query_type": "降雨"
  },
  "confidence": 0.98
}
```

**优点：**
- 实现简单，快速上线
- 灵活性高，易于调整
- 可以处理复杂的自然语言

**缺点：**
- 输出格式不稳定
- 需要额外的解析和验证
- Token消耗较大

### 2.2 Function Calling方式（推荐）

这是目前最主流和可靠的意图识别方式，被智谱、OpenAI等主流平台采用。

**核心思想：**
将意图识别转化为函数调用问题，LLM判断应该调用哪个函数以及传入什么参数。

**实现示例：**
```python
# 1. 定义可用的工具/函数
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息，包括温度、湿度、风力、降雨概率等。当用户询问天气、气温、是否下雨等问题时使用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如：北京、上海、深圳"
                    },
                    "date": {
                        "type": "string",
                        "description": "日期，如：今天、明天、2024-01-20"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_reminder",
            "description": "设置提醒事项或闹钟。当用户要求设置提醒、创建待办、设置闹钟时使用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "提醒内容"
                    },
                    "time": {
                        "type": "string",
                        "description": "提醒时间，格式：YYYY-MM-DD HH:MM"
                    }
                },
                "required": ["content", "time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "在互联网上搜索信息。当用户需要查找最新资讯、搜索资料、了解某个话题时使用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索关键词"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

# 2. 调用LLM进行意图识别
from zhipuai import ZhipuAI

client = ZhipuAI(api_key="your_api_key")
response = client.chat.completions.create(
    model="glm-4",
    messages=[
        {"role": "user", "content": "明天北京天气怎么样？"}
    ],
    tools=tools,
    tool_choice="auto"  # 自动判断是否需要调用工具
)

# 3. LLM返回结果
# {
#   "choices": [{
#     "message": {
#       "role": "assistant",
#       "tool_calls": [{
#         "id": "call_123",
#         "type": "function",
#         "function": {
#           "name": "get_weather",
#           "arguments": "{\"city\": \"北京\", \"date\": \"明天\"}"
#         }
#       }]
#     }
#   }]
# }

# 4. 执行工具调用
import json
tool_call = response.choices[0].message.tool_calls[0]
function_name = tool_call.function.name
function_args = json.loads(tool_call.function.arguments)

# 调用实际的天气API
weather_result = get_weather(**function_args)

# 5. 将结果返回给LLM生成最终回复
final_response = client.chat.completions.create(
    model="glm-4",
    messages=[
        {"role": "user", "content": "明天北京天气怎么样？"},
        response.choices[0].message,
        {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(weather_result)
        }
    ]
)

# 最终输出："明天北京晴转多云，气温15-25℃，降雨概率10%，建议穿着轻薄外套。"
```

**优点：**
- 输出格式标准化（JSON Schema）
- 参数类型自动验证
- 支持并行调用多个工具
- 更高的准确率和稳定性
- 主流平台原生支持

**缺点：**
- 依赖平台支持
- 工具定义需要精心设计
- 调试相对复杂

---

## 三、意图识别的核心机制

### 3.1 LLM如何理解意图

**1. 上下文理解能力**
- LLM通过预训练学习了大量的语言模式和知识
- 能够理解自然语言中的隐含意图和语境
- 支持多轮对话中的意图延续和切换

**示例：**
```
用户："有点冷"
→ LLM理解：用户可能想调高温度
→ 意图：adjust_temperature
→ 参数：direction="increase"

用户："帮我订一张票"
→ 需要结合上下文判断：
  - 如果之前在讨论电影 → 订电影票
  - 如果之前在讨论旅行 → 订机票/火车票
```

**2. 工具描述匹配**
- LLM读取所有可用工具的描述（description字段）
- 将用户输入与工具描述进行语义匹配
- 选择语义最相关的工具

**匹配过程：**
```
用户输入："明天会下雨吗？"

工具1: get_weather
描述："获取天气信息，包括温度、降雨等"
相关度：★★★★★ (高度相关)

工具2: set_reminder
描述："设置提醒事项"
相关度：★☆☆☆☆ (不相关)

工具3: search_web
描述："搜索互联网信息"
相关度：★★☆☆☆ (弱相关)

→ 选择：get_weather
```

**3. 参数提取与映射**
- 根据工具的参数定义（JSON Schema）
- 从用户输入中提取对应的参数值
- 处理参数缺失、类型转换、默认值等

**提取示例：**
```python
用户输入："后天下午3点提醒我开会"

参数定义：
{
  "content": {"type": "string"},
  "time": {"type": "string", "format": "YYYY-MM-DD HH:MM"}
}

LLM提取：
{
  "content": "开会",
  "time": "2024-01-22 15:00"  # 自动计算后天的日期
}
```

### 3.2 意图识别的决策流程

```
┌─────────────┐
│  用户输入    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ 1. 理解语义      │ ← 基于预训练知识
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 2. 匹配工具      │ ← 对比工具描述
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 3. 提取参数      │ ← 根据Schema提取
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 4. 验证参数      │ ← 类型、必填项检查
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 5. 生成调用      │ ← 输出Function Call
└─────────────────┘
```

---

## 四、复杂场景处理

### 4.1 多意图识别

用户在一句话中表达多个意图，Agent需要识别并处理所有意图。

**场景示例：**
```python
用户输入："帮我查一下明天北京的天气，然后设置一个下午3点的提醒"

# LLM识别出两个意图
response = {
    "tool_calls": [
        {
            "function": {
                "name": "get_weather",
                "arguments": {"city": "北京", "date": "明天"}
            }
        },
        {
            "function": {
                "name": "set_reminder",
                "arguments": {"content": "提醒", "time": "明天 15:00"}
            }
        }
    ]
}

# 处理策略
# 1. 并行执行：两个意图独立，可以同时执行
# 2. 顺序执行：后一个意图依赖前一个的结果
# 3. 用户确认：意图较多时，先确认再执行
```

**实现要点：**
- 支持并行工具调用（智谱GLM-4支持）
- 处理意图间的依赖关系
- 合理组织返回结果

### 4.2 意图消歧（Disambiguation）

当用户输入存在歧义时，需要进行意图消歧。

**歧义类型与处理策略：**

| 歧义类型 | 用户输入示例 | 可能的意图解释 | 消歧策略 | 实现示例 |
|---------|------------|--------------|---------|---------|
| **词义歧义** | "苹果多少钱？" | 1. 查询水果价格<br>2. 查询苹果公司股价<br>3. 查询苹果手机价格 | • 基于对话历史判断<br>• 询问用户澄清<br>• 选择最常见的意图 | ```python<br># 基于上下文判断<br>if "水果" in context:<br>    intent = "查询水果价格"<br>elif "股票" in context:<br>    intent = "查询股价"<br>else:<br>    # 询问用户<br>    ask_user("您是想查询：<br>1.水果价格 2.股价 3.手机价格")<br>``` |
| **指代歧义** | 对话历史：<br>"北京明天天气怎么样？"<br>"明天北京晴，15-25℃"<br>用户："上海呢？" | "呢"指代"天气怎么样" | • 保持相同的意图<br>• 替换参数值<br>• 利用对话历史 | ```python<br># LLM理解指代<br>last_intent = "get_weather"<br>last_params = {<br>    "city": "北京",<br>    "date": "明天"<br>}<br># 新意图继承上下文<br>new_intent = last_intent<br>new_params = {<br>    "city": "上海",  # 替换<br>    "date": "明天"   # 保持<br>}<br>``` |
| **意图不明确** | "帮我处理一下" | 意图过于模糊，<br>无法确定具体操作 | **策略1：要求用户明确**<br>"请问您需要我帮您处理什么呢？"<br><br>**策略2：提供选项**<br>"我可以帮您：<br>1. 查询信息<br>2. 设置提醒<br>3. 发送消息<br>请告诉我您需要哪一项服务。"<br><br>**策略3：基于上下文推断**<br>• 如果之前在讨论邮件 → 处理邮件<br>• 如果之前在讨论文档 → 处理文档 | ```python<br># 置信度低时要求澄清<br>if confidence < 0.5:<br>    return ask_clarification()<br><br># 基于上下文推断<br>if "邮件" in recent_context:<br>    intent = "process_email"<br>elif "文档" in recent_context:<br>    intent = "process_document"<br>else:<br>    return provide_options()<br>``` |

**消歧决策流程：**

```
用户输入
    ↓
检测歧义类型
    ↓
┌───────────┬───────────┬───────────┐
│ 词义歧义   │ 指代歧义   │ 意图不明确 │
└─────┬─────┴─────┬─────┴─────┬─────┘
      ↓           ↓           ↓
  查看上下文   分析对话历史  评估置信度
      ↓           ↓           ↓
  有明确线索？  能推断指代？  置信度>阈值？
   ↙  ↘       ↙  ↘       ↙  ↘
  是   否     是   否     是   否
  ↓    ↓     ↓    ↓     ↓    ↓
直接执行 询问  直接执行 询问  执行  要求澄清
        用户          用户      +提示
```

**最佳实践：**

1. **优先使用上下文**：充分利用对话历史和用户偏好
2. **设置置信度阈值**：低于阈值时主动询问用户
3. **提供明确选项**：让用户从具体选项中选择，而不是开放式提问
4. **记录消歧结果**：学习用户的选择模式，优化后续判断
5. **友好的交互**：消歧过程要自然，不要让用户感到繁琐


### 4.3 意图链（Intent Chaining）

复杂任务需要执行一系列相关的意图，形成意图链。

**示例：订机票流程**
```python
用户："帮我订一张明天去上海的机票"

# 意图链
意图1: search_flights
  ↓ 返回航班列表
意图2: select_flight (需要用户选择)
  ↓ 用户选择航班
意图3: fill_passenger_info
  ↓ 填写乘客信息
意图4: confirm_booking
  ↓ 用户确认
意图5: process_payment
  ↓ 完成支付
意图6: send_confirmation
  ↓ 发送确认信息

# 实现要点
- 状态管理：记录当前执行到哪一步
- 上下文传递：前一步的结果传递给下一步
- 错误处理：任何一步失败都要能回退
- 用户交互：关键步骤需要用户确认
```

**状态机实现：**
```python
class BookingStateMachine:
    def __init__(self):
        self.state = "INIT"
        self.context = {}

    def handle_intent(self, intent, params):
        if self.state == "INIT" and intent == "search_flights":
            flights = search_flights(**params)
            self.context["flights"] = flights
            self.state = "FLIGHT_SELECTION"
            return flights

        elif self.state == "FLIGHT_SELECTION" and intent == "select_flight":
            selected = params["flight_id"]
            self.context["selected_flight"] = selected
            self.state = "PASSENGER_INFO"
            return "请提供乘客信息"

        # ... 其他状态转换
```

---

## 五、传统方法对比

### 5.1 传统NLU方式

在LLM普及之前，意图识别主要使用传统的NLU（自然语言理解）技术。

**技术架构：**
```
用户输入
  ↓
文本预处理（分词、去停用词）
  ↓
特征提取（TF-IDF、Word2Vec）
  ↓
意图分类器（SVM、BERT）
  ↓
槽位填充（BiLSTM-CRF、BERT-NER）
  ↓
输出：意图 + 参数
```

**实现示例：**
```python
# 1. 意图分类
from transformers import BertForSequenceClassification

# 训练数据
train_data = [
    ("明天天气怎么样", "查询天气"),
    ("提醒我开会", "设置提醒"),
    ("搜索人工智能", "搜索信息"),
    # ... 需要大量标注数据
]

# 训练分类器
model = BertForSequenceClassification.from_pretrained(
    "bert-base-chinese",
    num_labels=10  # 10个意图类别
)

# 2. 槽位填充
from transformers import BertForTokenClassification

# 标注数据（BIO格式）
slot_data = [
    ("明天 北京 天气", ["B-DATE", "B-CITY", "O"]),
    ("下午 三点 提醒 我", ["B-TIME", "I-TIME", "O", "O"]),
]

# 训练槽位填充模型
slot_model = BertForTokenClassification.from_pretrained(
    "bert-base-chinese",
    num_labels=len(slot_tags)
)
```

### 5.2 方法对比

| 维度 | 传统NLU方式 | LLM方式 |
|------|------------|---------|
| **数据需求** | 需要大量标注数据（数千到数万条） | 零样本/少样本即可 |
| **开发周期** | 长（数据标注+模型训练） | 短（定义工具即可） |
| **泛化能力** | 弱（只能识别训练过的意图） | 强（可以理解新意图） |
| **准确率** | 训练集内高，训练集外低 | 整体较高且稳定 |
| **成本** | 前期高（标注成本），后期低（推理便宜） | 前期低，后期高（API调用费用） |
| **可控性** | 强（可以精确控制） | 弱（依赖模型能力） |
| **复杂意图** | 难以处理 | 容易处理 |
| **多轮对话** | 需要额外的对话管理模块 | 原生支持 |
| **维护成本** | 高（新增意图需要重新训练） | 低（只需添加工具定义） |

### 5.3 混合方案

在实际应用中，可以结合两种方法的优势。

**方案1：LLM + 规则**
```python
# 对于高频、确定性的意图，使用规则快速匹配
if "天气" in user_input:
    intent = "get_weather"
    # 规则提取参数
elif "提醒" in user_input or "闹钟" in user_input:
    intent = "set_reminder"
else:
    # 其他情况使用LLM
    intent = llm_intent_recognition(user_input)
```

**方案2：LLM + 传统分类器**
```python
# 先用轻量级分类器快速判断大类
category = fast_classifier(user_input)

if category == "simple_query":
    # 简单查询用规则处理
    result = rule_based_handler(user_input)
else:
    # 复杂意图用LLM处理
    result = llm_handler(user_input)
```

---

## 六、实际落地关键点

### 6.1 工具描述优化

工具描述的质量直接影响意图识别的准确率。

**好的工具描述特征：**
```python
# ❌ 不好的描述
{
    "name": "get_weather",
    "description": "获取天气",  # 太简单
    "parameters": {...}
}

# ✅ 好的描述
{
    "name": "get_weather",
    "description": "获取指定城市的实时天气信息，包括温度、湿度、风力、降雨概率等。当用户询问天气、气温、是否下雨、穿什么衣服等与天气相关的问题时使用此工具。",
    "parameters": {
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": "城市名称，如：北京、上海、深圳。支持中文城市名。"
            },
            "date": {
                "type": "string",
                "description": "查询日期，支持格式：今天、明天、后天、2024-01-20。默认为今天。"
            }
        },
        "required": ["city"]
    }
}
```

**描述优化技巧：**
1. **明确功能范围**：说清楚工具能做什么、不能做什么
2. **列举使用场景**：给出典型的触发词和问法
3. **详细参数说明**：每个参数的含义、格式、示例
4. **区分相似工具**：如果有功能相近的工具，要说明区别

### 6.2 Few-shot示例

通过提供示例来提高识别准确率。

**实现方式：**
```python
system_prompt = """
你是一个智能助手，可以调用以下工具：
[工具定义...]

以下是一些示例：

示例1：
用户：明天会下雨吗？
意图：get_weather
参数：{"city": "当前城市", "date": "明天"}

示例2：
用户：提醒我下午3点开会
意图：set_reminder
参数：{"content": "开会", "time": "今天 15:00"}

示例3：
用户：搜索一下人工智能的最新进展
意图：search_web
参数：{"query": "人工智能最新进展"}

现在请处理用户的输入。
"""
```

**Few-shot的作用：**
- 展示期望的输出格式
- 提供参数提取的示例
- 处理边界情况和特殊场景

### 6.3 置信度评估

评估意图识别的可靠性，对低置信度的结果进行特殊处理。

**实现方式：**
```python
# 方式1：要求LLM输出置信度
system_prompt = """
识别意图后，请评估你的置信度（0-1之间）：
- 0.9-1.0: 非常确定
- 0.7-0.9: 比较确定
- 0.5-0.7: 不太确定
- 0.0-0.5: 很不确定
"""

# 方式2：基于多个指标综合判断
def calculate_confidence(response):
    confidence = 1.0

    # 检查是否有多个可能的工具
    if len(candidate_tools) > 1:
        confidence *= 0.8

    # 检查参数是否完整
    missing_params = check_missing_params(response)
    if missing_params:
        confidence *= 0.7

    # 检查用户输入的清晰度
    if is_ambiguous(user_input):
        confidence *= 0.6

    return confidence

# 方式3：使用logprobs（如果平台支持）
# 分析token的概率分布来评估置信度
```

**基于置信度的处理策略：**
```python
if confidence >= 0.9:
    # 高置信度：直接执行
    execute_tool(tool_call)

elif confidence >= 0.7:
    # 中等置信度：执行但提示用户
    result = execute_tool(tool_call)
    return f"{result}\n（如果不是您想要的，请告诉我）"

elif confidence >= 0.5:
    # 低置信度：先确认再执行
    return f"您是想要{intent_description}吗？"

else:
    # 很低置信度：要求用户重新表达
    return "抱歉，我没有理解您的意思。能否换个方式说明？"
```

### 6.4 错误处理

意图识别可能出现的错误及处理方案。

**常见错误类型：**

**1. 无法识别意图**
```python
# 用户输入过于模糊或超出能力范围
用户："帮我处理一下那个事情"

# 处理策略
def handle_no_intent():
    return """
    抱歉，我没有理解您的需求。我可以帮您：
    1. 查询天气信息
    2. 设置提醒事项
    3. 搜索网络信息
    4. 进行数学计算

    请告诉我您需要哪项服务？
    """
```

**2. 参数缺失**
```python
# LLM无法从输入中提取必需参数
用户："查一下天气"  # 缺少城市参数

# 处理策略
def handle_missing_params(tool_call, missing_params):
    if "city" in missing_params:
        return "请问您想查询哪个城市的天气？"
    if "time" in missing_params:
        return "请问您想设置什么时间的提醒？"
```

**3. 参数格式错误**
```python
# 参数类型或格式不符合要求
{
    "time": "明天下午"  # 期望格式：YYYY-MM-DD HH:MM
}

# 处理策略
def validate_and_fix_params(params):
    if "time" in params:
        # 尝试解析和转换
        parsed_time = parse_time(params["time"])
        if parsed_time:
            params["time"] = parsed_time.strftime("%Y-%m-%d %H:%M")
        else:
            raise ValueError("时间格式无法识别")
```

**4. 工具调用失败**
```python
# 工具执行出错（API失败、网络问题等）
try:
    result = execute_tool(tool_call)
except ToolExecutionError as e:
    # 重试机制
    for i in range(3):
        try:
            result = execute_tool(tool_call)
            break
        except:
            if i == 2:
                return "抱歉，服务暂时不可用，请稍后再试。"
            time.sleep(1)
```

### 6.5 性能优化

**1. 缓存策略**
```python
# 缓存相似问题的识别结果
from functools import lru_cache

@lru_cache(maxsize=1000)
def recognize_intent(user_input):
    # 对于完全相同的输入，直接返回缓存结果
    return llm_recognize(user_input)

# 语义相似度缓存
def semantic_cache_recognize(user_input):
    # 查找语义相似的历史输入
    similar = find_similar_query(user_input, threshold=0.95)
    if similar:
        return cached_results[similar]
    else:
        result = llm_recognize(user_input)
        cache_result(user_input, result)
        return result
```

**2. 模型选择**
```python
# 根据场景选择合适的模型
def choose_model(user_input):
    if is_simple_query(user_input):
        return "glm-4-flash"  # 快速、便宜
    else:
        return "glm-4"  # 准确、强大
```

**3. 批处理**
```python
# 批量处理多个意图识别请求
async def batch_recognize(inputs):
    tasks = [recognize_intent(inp) for inp in inputs]
    results = await asyncio.gather(*tasks)
    return results
```

---

## 七、智谱Agent平台实现

### 7.1 平台架构

智谱Agent平台使用**Function Calling + 工作流编排**的方式实现意图识别。

**核心组件：**
```
┌─────────────────────────────────────┐
│         用户交互层                   │
│  (Web界面 / API接口 / SDK)          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Agent调度层                  │
│  - 意图识别引擎                      │
│  - 工作流引擎                        │
│  - 上下文管理                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         能力层                       │
│  - GLM-4 模型服务                   │
│  - Function Calling                 │
│  - 工具库 (内置+自定义)              │
│  - 知识库 (RAG)                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         基础设施层                   │
│  - 向量数据库                        │
│  - 消息队列                          │
│  - 日志监控                          │
└─────────────────────────────────────┘
```

### 7.2 使用方式

**1. 定义工具**
```python
# 在智谱平台上定义工具
tool_definition = {
    "name": "get_weather",
    "description": "获取城市天气信息",
    "parameters": {
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "城市名称"}
        },
        "required": ["city"]
    },
    "implementation": {
        "type": "api",
        "url": "https://api.weather.com/v1/current",
        "method": "GET"
    }
}
```

**2. 配置工作流**
```yaml
# 可视化配置意图处理流程
workflow:
  - node: intent_recognition
    type: llm
    model: glm-4
    tools: [get_weather, set_reminder, search_web]

  - node: execute_tool
    type: tool_call
    retry: 3
    timeout: 30s

  - node: generate_response
    type: llm
    model: glm-4
```

**3. 调试与监控**
- 实时查看意图识别结果
- 追踪工具调用链路
- 分析识别准确率
- 优化Prompt和工具描述

### 7.3 智谱平台的优势

**技术优势：**
- GLM-4模型在中文意图理解上表现优异
- 原生支持Function Calling，稳定可靠
- 支持128K长上下文，适合复杂对话

**产品优势：**
- 低代码平台，降低开发门槛
- 可视化工作流编排
- 完善的调试和监控工具
- 企业级权限管理和审计

---

## 八、常见面试问题

### Q1: 如何提高意图识别的准确率？

**回答要点：**

1. **优化工具描述**
   - 详细说明工具功能和使用场景
   - 列举典型的触发词和问法
   - 区分功能相似的工具

2. **提供Few-shot示例**
   - 在Prompt中加入典型示例
   - 展示参数提取的正确方式
   - 覆盖边界情况

3. **使用更强的模型**
   - GLM-4 vs GLM-4-Flash
   - 根据场景选择合适的模型

4. **增加上下文信息**
   - 利用对话历史
   - 记住用户偏好
   - 考虑业务场景

5. **持续优化迭代**
   - 收集badcase
   - 分析识别错误原因
   - 调整Prompt和工具定义

### Q2: 如何处理意图识别错误？

**回答要点：**

1. **置信度评估**
   - 对识别结果进行置信度评分
   - 低置信度时要求用户确认

2. **用户确认机制**
   - 关键操作前先确认
   - 提供撤销和重做功能

3. **错误重试**
   - API调用失败自动重试
   - 提供降级方案

4. **人工兜底**
   - 复杂情况转人工处理
   - 建立人工审核机制

5. **日志和监控**
   - 记录所有识别结果
   - 分析错误模式
   - 及时发现和修复问题

### Q3: Function Calling和传统意图识别的区别？

**回答要点：**

**Function Calling：**
- LLM原生能力，不需要训练
- 零样本/少样本学习
- 输出格式标准化（JSON Schema）
- 泛化能力强，可以理解新意图
- 成本较高（API调用费用）

**传统意图识别：**
- 需要标注数据和模型训练
- 只能识别训练过的意图
- 需要单独的槽位填充模块
- 推理成本低
- 维护成本高（新增意图需重新训练）

**适用场景：**
- Function Calling：快速迭代、复杂意图、多样化场景
- 传统方法：高频固定场景、成本敏感、强可控性要求

### Q4: 如何评估Agent的意图识别性能？

**回答要点：**

**技术指标：**
1. **准确率（Accuracy）**
   - 正确识别的意图数 / 总请求数
   - 目标：>95%

2. **召回率（Recall）**
   - 应该识别出的意图中，实际识别出的比例
   - 重要场景不能漏识别

3. **F1分数**
   - 准确率和召回率的调和平均
   - 综合评估性能

4. **响应时间**
   - P50/P95/P99延迟
   - 目标：<2秒

**业务指标：**
1. **任务完成率**
   - 用户意图最终被正确执行的比例

2. **用户满意度（CSAT）**
   - 用户对识别结果的满意程度

3. **人工转接率**
   - 需要转人工处理的比例
   - 越低越好

**评估方法：**
- A/B测试：对比不同方案的效果
- 用户反馈：收集真实用户评价
- 专家评审：人工评估识别质量

### Q5: 多Agent协作中如何处理意图冲突？

**回答要点：**

**冲突场景：**
```python
# 场景1：多个Agent识别出不同的意图
Agent A: "用户想查询天气"
Agent B: "用户想设置提醒"

# 场景2：意图执行结果冲突
Agent A: "建议用户穿厚外套"
Agent B: "建议用户穿短袖"
```

**解决方案：**

1. **优先级机制**
   - 为不同Agent设置优先级
   - 高优先级Agent的判断优先采纳

2. **投票机制**
   - 多个Agent投票决定最终意图
   - 采用多数原则

3. **置信度比较**
   - 比较各Agent的置信度
   - 选择置信度最高的结果

4. **Manager Agent协调**
   - 由Manager Agent综合判断
   - 做出最终决策

5. **用户确认**
   - 将冲突呈现给用户
   - 让用户做最终选择

### Q6: 如何处理意图的上下文依赖？

**回答要点：**

**上下文类型：**

1. **对话历史依赖**
```python
用户："北京明天天气怎么样？"
Agent："明天北京晴，15-25℃"
用户："上海呢？"  # 依赖前文，意图是查询上海天气

# 实现方式
context = {
    "last_intent": "get_weather",
    "last_params": {"city": "北京", "date": "明天"}
}

# 识别新意图时参考上下文
new_intent = recognize_with_context(
    user_input="上海呢？",
    context=context
)
# 结果：get_weather, {"city": "上海", "date": "明天"}
```

2. **任务状态依赖**
```python
# 订票流程中的意图依赖当前状态
if state == "FLIGHT_SELECTION":
    # 用户输入"第一个"应该理解为选择第一个航班
    intent = "select_flight"
elif state == "PAYMENT":
    # 用户输入"确认"应该理解为确认支付
    intent = "confirm_payment"
```

3. **用户偏好依赖**
```python
# 记住用户的常用设置
user_preferences = {
    "default_city": "北京",
    "temperature_unit": "celsius",
    "language": "zh-CN"
}

# 识别意图时应用偏好
if "city" not in params and user_preferences["default_city"]:
    params["city"] = user_preferences["default_city"]
```

**实现技术：**
- 对话状态管理（Dialogue State Tracking）
- 上下文窗口（Context Window）
- 记忆机制（Memory）

### Q7: 意图识别在实际业务中的挑战有哪些？

**回答要点：**

1. **长尾意图问题**
   - 80%的请求集中在20%的意图
   - 长尾意图难以覆盖全面
   - 解决：LLM的泛化能力 + 持续优化

2. **领域特定术语**
   - 不同行业有专业术语
   - 通用模型可能理解不准确
   - 解决：领域知识注入、Few-shot示例

3. **多语言支持**
   - 用户可能使用方言、中英混合
   - 解决：多语言模型、语言检测

4. **实时性要求**
   - 用户期望快速响应
   - LLM推理有延迟
   - 解决：缓存、流式输出、模型优化

5. **成本控制**
   - API调用费用累积
   - 需要平衡准确率和成本
   - 解决：混合方案、批处理、缓存

6. **隐私和安全**
   - 用户输入可能包含敏感信息
   - 需要数据脱敏和访问控制
   - 解决：本地部署、数据加密

---

## 九、最佳实践总结

### 9.1 设计原则

1. **用户体验优先**
   - 快速响应（<2秒）
   - 友好的错误提示
   - 支持撤销和重做

2. **渐进式增强**
   - 从简单场景开始
   - 逐步增加复杂功能
   - 持续优化迭代

3. **可观测性**
   - 完整的日志记录
   - 实时监控告警
   - 可追溯的调用链路

4. **容错设计**
   - 优雅降级
   - 错误重试
   - 人工兜底

### 9.2 开发建议

1. **工具定义要清晰**
   - 详细的描述和示例
   - 明确的参数定义
   - 区分相似工具

2. **充分测试**
   - 单元测试：测试各个工具
   - 集成测试：测试意图识别流程
   - 用户测试：真实场景验证

3. **持续优化**
   - 收集用户反馈
   - 分析badcase
   - 定期更新Prompt

4. **文档完善**
   - API文档
   - 使用示例
   - 最佳实践

### 9.3 关键指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 意图识别准确率 | >95% | 正确识别用户意图的比例 |
| 响应时间P95 | <2s | 95%的请求在2秒内完成 |
| 任务完成率 | >90% | 用户任务成功完成的比例 |
| 用户满意度 | >4.5/5 | 用户评分 |
| 人工转接率 | <5% | 需要转人工的比例 |

---

## 十、参考资源

### 学术论文
- **ReAct**: Synergizing Reasoning and Acting in Language Models
- **Function Calling**: Tool Learning with Foundation Models
- **Intent Recognition**: A Survey of Intent Detection Methods

### 技术文档
- [智谱AI开放平台文档](https://open.bigmodel.cn/)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [LangChain Agent Documentation](https://python.langchain.com/docs/modules/agents/)

### 开源项目
- **LangChain**: Agent开发框架
- **Semantic Kernel**: 微软的Agent框架
- **AutoGPT**: 自主Agent实现

---

## 总结

意图识别是Agent系统的核心能力，直接决定了Agent能否准确理解和执行用户需求。现代Agent系统主要采用基于LLM的Function Calling方式，相比传统方法具有更强的泛化能力和更低的开发成本。

**核心要点：**
- Function Calling是当前主流方案
- 工具描述质量直接影响识别准确率
- 需要处理多意图、消歧、上下文依赖等复杂场景
- 重视错误处理和用户体验
- 持续优化和迭代是关键

在实际应用中，要根据业务场景选择合适的技术方案，平衡准确率、成本、性能等多个维度，构建可靠、高效的意图识别系统。

---

*文档版本：v1.0*
*最后更新：2026-01-27*
*适用场景：Agent系统开发、技术面试准备*