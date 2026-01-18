# 🚀 快速开始指南

## 第一步：设置 Supabase 数据库

### 1. 打开 Supabase SQL Editor

访问：https://your-project.supabase.co （替换为你的 Supabase 项目 URL）

点击左侧菜单的 **SQL Editor**

### 2. 执行数据库脚本

1. 点击 **+ New query**
2. 打开项目中的 `database-schema.sql` 文件
3. 复制全部内容
4. 粘贴到 SQL 编辑器
5. 点击 **Run** 按钮执行

✅ 成功后会创建所有必需的数据库表

---

## 第二步：注册测试账号

### 方法 1: 直接在 Supabase 创建用户（推荐）

1. 在 Supabase Dashboard 中，点击左侧 **Authentication**
2. 点击 **Users** 选项卡
3. 点击右上角 **Add user** 按钮
4. 选择 **Create new user**
5. 输入测试邮箱和密码：
   ```
   Email: your_test_email@example.com
   Password: Test123456!
   ```
6. 勾选 **Auto Confirm User** (自动确认用户)
7. 点击 **Create user**

### 方法 2: 使用登录页面注册（需配置邮件）

1. 打开 `index.html`
2. 点击"立即注册"
3. 输入邮箱和密码
4. 查收验证邮件

---

## 第三步：测试登录

1. 打开 `index.html` 在浏览器中
2. 使用您创建的测试账号登录
3. 登录成功后会自动跳转到翻译器页面

---

## 🎯 测试功能清单

### ✅ 登录功能
- [ ] 邮箱密码登录
- [ ] 邮箱验证码登录（需配置邮件服务）
- [ ] 记住我功能

### ✅ 翻译功能
- [ ] 输入文本翻译
- [ ] 查看翻译结果
- [ ] 复制翻译结果
- [ ] 语音朗读

### ✅ 历史记录
- [ ] 查看翻译历史
- [ ] 点击历史记录加载
- [ ] 历史记录云端同步

### ✅ 设置功能
- [ ] 查看当前登录账号
- [ ] 退出登录

---

## ⚡ 快速测试步骤

### 1. 测试登录
```
邮箱: your_test_email@example.com
密码: Test123456!
```

### 2. 测试翻译
```
输入: Hello, how are you?
预期结果: 显示中文翻译
```

### 3. 测试历史记录
1. 翻译几个句子
2. 点击顶部"历史"标签
3. 应该看到刚才的翻译记录

### 4. 测试退出登录
1. 点击"设置"标签
2. 点击"退出登录"按钮
3. 应该跳转回登录页面

---

## 🔧 故障排查

### 问题 1: 无法登录
**检查：**
- 是否执行了数据库脚本？
- 账号是否已在 Supabase 创建？
- 打开浏览器控制台（F12）查看错误信息

**解决方法：**
```javascript
// 在浏览器控制台运行以检查连接
console.log(window.supabaseClient)
```

### 问题 2: 翻译历史不显示
**检查：**
- 是否已登录？
- 是否翻译过内容？
- 打开 Supabase Dashboard → Table Editor → translation_history 查看数据

### 问题 3: 页面空白
**检查：**
- 打开浏览器控制台查看错误
- 确认所有 JS 文件都已加载
- 检查 Supabase SDK 是否正确加载

---

## 📁 项目文件说明

```
tran/
├── index.html                    # 登录页面
├── translator.html               # 翻译器主页面
│
├── supabase-config.js           # ✨ Supabase 配置
├── auth-service.js              # ✨ 认证服务
├── database-service.js          # ✨ 数据库服务
│
├── script-supabase.js          # ✨ 登录逻辑（Supabase版）
├── translator-supabase.js      # ✨ 翻译器逻辑（Supabase版）
│
├── script.js                    # 登录逻辑（本地版）
├── translator.js                # 翻译器逻辑（本地版）
│
├── styles.css                   # 登录页面样式
├── translator.css               # 翻译器样式
│
├── database-schema.sql          # ✨ 数据库建表脚本
├── SUPABASE_SETUP.md           # Supabase 详细说明
└── QUICK_START.md              # 本文件
```

✨ 标记的文件是 Supabase 集成相关文件

---

## 🎉 成功标志

如果看到以下内容，说明集成成功：

1. ✅ 可以成功登录
2. ✅ 可以看到用户邮箱显示在设置页面
3. ✅ 翻译后的内容出现在历史记录中
4. ✅ 退出登录后需要重新登录才能访问翻译器

---

## 📞 需要帮助？

1. 查看 `SUPABASE_SETUP.md` 了解详细设置
2. 查看 `TEST_ACCOUNTS.md` 了解本地测试账号
3. 打开浏览器控制台（F12）查看错误信息
4. 检查 Supabase Dashboard 的日志

---

## 🚀 下一步

集成成功后，您可以：

1. **接入真实翻译 API**
   - 修改 `translator-supabase.js` 中的 `simulateTranslation` 函数
   - 接入 Google Translate、DeepL 等 API

2. **配置邮件服务**
   - 在 Supabase → Settings → Auth → SMTP Settings
   - 配置自定义 SMTP 或使用内置邮件服务

3. **添加更多登录方式**
   - Google OAuth
   - GitHub OAuth
   - 其他第三方登录

4. **部署到生产环境**
   - 使用 Vercel、Netlify 等平台
   - 配置自定义域名

---

祝您使用愉快！🎉
