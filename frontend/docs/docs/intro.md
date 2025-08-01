---
id: intro
title: 介绍
sidebar_position: 1
---

# Happy-TTS API 文档

欢迎使用 Happy-TTS 文本转语音服务 API 文档！

## 概述

Happy-TTS 是一个基于 OpenAI TTS 技术的文本转语音服务，提供高质量的语音合成功能。本 API 支持多种语音模型和发音人，可以满足不同场景的语音合成需求。

## 主要特性

- 🎯 **高质量语音合成** - 基于 OpenAI TTS 技术，提供自然流畅的语音输出
- 🔧 **多种语音模型** - 支持多种语音模型和发音人选择
- 🚀 **快速响应** - 优化的服务架构，确保快速响应时间
- 🔒 **安全可靠** - 内置违禁词检测和用户权限管理
- 📊 **使用统计** - 提供详细的使用记录和统计功能
- 🛡️ **防护机制** - 完善的限流和防滥用机制

## 支持的语音模型

| 模型     | 描述         | 支持格式             |
| -------- | ------------ | -------------------- |
| tts-1    | 标准语音模型 | mp3, opus, aac, flac |
| tts-1-hd | 高清语音模型 | mp3, opus, aac, flac |

## 支持的发音人

| 发音人  | 语言   | 特点                   |
| ------- | ------ | ---------------------- |
| alloy   | 多语言 | 中性声音，适合多种场景 |
| echo    | 英语   | 清晰明亮的声音         |
| fable   | 英语   | 温暖友好的声音         |
| onyx    | 英语   | 深沉有力的声音         |
| nova    | 英语   | 年轻活力的声音         |
| shimmer | 英语   | 柔和优雅的声音         |

## 快速开始

1. **获取 API 密钥** - 注册账户并获取访问令牌
2. **选择语音模型** - 根据需求选择合适的语音模型和发音人
3. **发送请求** - 使用 REST API 发送文本转语音请求
4. **获取结果** - 接收生成的音频文件

## API 基础信息

- **基础 URL**: `https://api.hapxs.com`
- **认证方式**: Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 使用限制

- **文本长度**: 单次请求最大 4096 个字符
- **请求频率**: 每分钟最多 10 次请求
- **文件格式**: 支持 mp3, opus, aac, flac
- **语速范围**: 0.25 - 4.0

## 错误处理

API 使用标准的 HTTP 状态码表示请求结果：

- `200` - 请求成功
- `400` - 请求参数错误
- `401` - 认证失败
- `403` - 权限不足
- `429` - 请求频率超限
- `500` - 服务器内部错误

## 支持与反馈

如果您在使用过程中遇到问题或有任何建议，请通过以下方式联系我们：

- 📧 **邮箱**: support@hapxs.com
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/happy-tts/happy-tts/issues)
- 💬 **社区讨论**: [Discord](https://discord.gg/happy-tts)

---

**开始使用** → [快速开始](./getting-started.md)
