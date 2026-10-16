# Bags Star 注册验证码邮件接入

状态（2026-10-14）：用户改用现有网易企业邮箱，Supabase 自定义 SMTP 和注册确认模板已保存。已从本机验证 TLS 证书和 SMTP 登录成功（235）；用户已反馈收到邮件。原本地标签页加载旧脚本，现已刷新并补强两步注册提示；真实验证码端到端核验仍待用户测试。邮箱确认开关 `mailer_autoconfirm=false`，保持开启。验证码前端已于 2026-10-15 统一发布，当前正式地址为 https://www.bag-star.com；真实收件与正确/错误验证码流程仍由用户验收。

## 当前发信配置：网易企业邮箱

- 发件地址 / 用户名：`service@bags-star.com`；发件人名称：`Bags Star`。
- SMTP：`smtphz.qiye.163.com:465`，SSL/TLS。
- 授权码由用户提供，经授权填写到 Supabase SMTP 密码栏；不写入项目文件、前端配置或 Git。
- 同一用户最短发信间隔：60 秒。控制台提示启用 SMTP 后项目邮件限流为 30 封 / 小时；未额外提高限额。
- 无需注册 Resend、购买套餐或修改现有 DNS。本次未发送测试邮件、未创建测试用户。

## Supabase 控制台

- 2026-10-16 只读复核：Site URL 仍为 `http://localhost:3000`，需保存为 `https://www.bag-star.com` 后复核。此项尚未完成，影响邮件链接的默认回跳；页面输入验证码不依赖该默认值。

- 保持 Email provider 的 Confirm email 开启。
- Custom SMTP：已按上述配置启用并保存；控制台显示密码已存储且隐藏。
- Confirm signup 模板：主题 `Your Bags Star verification code`；正文用 `templates/confirm-signup.html`，其中 `{{ .Token }}` 为 Supabase 生成的验证码。不要把 Token 改成前端生成的数字。
- 模板同时保留 `{{ .ConfirmationURL }}` 确认链接，保留邮件链接确认方式。新版本地及线上页面均可输入验证码；配置作用于共享云项目，新版前端已统一发布。
- 验证码时效、尝试频率和邮件发送限流由 Supabase 后端执行。前端重发冷却 60 秒只是体验限制。

## 验收

- 使用用户指定的全新真实邮箱：填写姓名 / 邮箱 / 密码，发送注册邮件。
- 未确认前，密码登录应返回未确认；收件箱出现 Bags Star 验证码（也检查垃圾邮件）。
- 发送邮件后应显示第 2 步核验表单，而不是注册成功；错误 / 过期码不登录。正确码确认邮箱后显示“注册完成”，点击“进入网站”进入客户页面；验证码不能重复使用。
- 重发按钮先倒计时，再发送；最新码可用；刷新页面保留邮箱和倒计时，不保存密码 / 验证码。
- 已注册邮箱按登录流程处理，不泄露或覆盖原密码。已注册请求在服务端可能返回模糊成功，因此 UI 不保证每个提交一定发信。
- `npm run dev` 默认使用 cloud 模式（5173），加载忽略文件 `.env.cloud.local`，连接真实 Supabase；5174 为 cloud 构建预览。两个地址均可测试真实验证码。
- 离线演示必须显式使用 `npm run dev:demo`（5175），该模式不发邮件、账号仅存在本机，注册页有明确提示。缺少云配置不再自动回退为演示注册。

资料：https://supabase.com/docs/guides/auth/auth-smtp 、https://supabase.com/docs/guides/auth/auth-email-templates
