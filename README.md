# TailAdmin React - Free React Tailwind Admin Dashboard Template

## Bags Star 本地运行

- `npm run dev`：默认连接 Supabase，读取 `.env.cloud.local` 中的公开项目 URL / publishable key，可测试真实注册验证码。默认端口 5173，本地操作会写入真实云数据库。
- `npm run build`：构建云端版本；`npm run preview -- --port 5174` 可预览。
- `npm run dev:demo`：显式启动离线演示（5175），使用 `.local-test/data.json`，不发邮件。仅用于模拟业务测试，不能用于验收邮箱注册。
- 云端配置缺失会报配置错误，不会自动注册演示账户。服务端密钥不得放入 `VITE_` 变量。

## Bags Star 线上部署配置（2026-10-16 同步）

- 积分平台：**https://www.bag-star.com**；阿里云服务器 `47.239.234.35`。HTTP IP、HTTP 域名和 HTTPS 裸域名跳转到正式入口，并保留路径和查询参数。
- 公司官网：https://www.bags-star.com（注意域名多一个 `s`）。两个网站通过 Nginx 域名区分，共用 80 / 443 端口。官网电脑、手机导航的 `Gift Center` 均链接 `https://www.bag-star.com/`，在新标签打开。
- 前端目录：`/www/wwwroot/bags-star-rewards/current`，当前指向 `releases/bags-star-20261016T062619Z`。React 静态构建由 Nginx 提供，后端使用 Supabase。
- 生产配置已从服务器同步，文件对应关系如下；这些配置包含服务器绝对路径，不能作为本机开发配置直接运行。

| 本地文件 | 服务器位置 / 用途 |
| --- | --- |
| `deployment/nginx-domain.conf.example` | `/www/server/panel/vhost/nginx/bags-star-rewards.conf`；当前生效的域名、HTTPS、重定向与 SPA 配置 |
| `deployment/upgrade_release.py` | `/root/bags-star-rewards-deploy/upgrade_release.py`；验证发布包、保留旧资源、原子切换和失败回退 |
| `deployment/rewards_certificate.py` | `/root/bags-star-rewards-deploy/rewards_certificate.py`；复用宝塔现有 ACME 运行环境及账户，只续签积分平台证书 |
| `deployment/bags-star-rewards-cert.service` | `/etc/systemd/system/bags-star-rewards-cert.service`；证书检查服务 |
| `deployment/bags-star-rewards-cert.timer` | `/etc/systemd/system/bags-star-rewards-cert.timer`；每日定时检查，剩余不足 30 天时续期 |
| `supabase/*.sql` | 16 份迁移由 `scripts/supabase_db.py` 管理；已与云端历史校验和核对一致 |
| `supabase/templates/confirm-signup.html` | 注册验证码邮件模板；发信设置见 `supabase/EMAIL_SETUP.md` |

`deployment/install_release.py` 和 `nginx-site.conf.example` 仅用于最初 HTTP 安装，不能覆盖当前线上 HTTPS 配置。现有站点升级应使用 `upgrade_release.py`。

日常发布：先执行 `npm run build`，再用 `scripts/package_frontend.py` 生成仅含静态文件的包和哈希清单，上传到服务器部署目录，运行升级脚本并验证正式域名。打包工具读取本机忽略配置进行凭据扫描；不要上传 `.env`、源码私钥或 `.local-test`。普通 Git 提交不会自动更新服务器。

证书位于 `/www/server/panel/vhost/cert/bags-star-rewards/current/`，ACME 账户在 root 私有目录。证书私钥、SSH 私钥、SMTP 授权码、Supabase 服务端密钥和客户数据都不进入仓库；新机器需单独配置这些凭据。`.env.example` 只提供公开前端变量占位符。

**尚未完成的云设置**：2026-10-16 只读复核，Supabase 默认邮件回跳 `Site URL` 仍为 `http://localhost:3000`。控制台应保存为 `https://www.bag-star.com` 后再次核验；不能把此处目标值当作已经生效。页面输入验证码及密码登录不依赖该默认回跳。此次同步不修改云端设置或客户数据。

TailAdmin is a free and open-source admin dashboard template built on **React and Tailwind CSS**, providing developers
with everything they need to create a comprehensive, data-driven back-end,
dashboard, or admin panel solution for upcoming web projects.

With TailAdmin, you get access to all the necessary dashboard UI components, elements, and pages required to build a
feature-rich and complete dashboard or admin panel. Whether you're building dashboard or admin panel for a complex web
application or a simple website, TailAdmin is the perfect solution to help you get up and running quickly.

![TailAdmin React.js Dashboard Preview](./banner.png)

## Overview

TailAdmin provides essential UI components and layouts for building feature-rich, data-driven admin dashboards and
control panels. It's built on:

- React 19
- TypeScript
- Tailwind CSS v4

### Quick Links

- [✨ Visit Website](https://tailadmin.com)
- [📄 Documentation](https://tailadmin.com/docs)
- [⬇️ Download](https://tailadmin.com/download)
- [🖌️ Figma Design File (Community Edition)](https://www.figma.com/community/file/1214477970819985778)
- [⚡ Get PRO Version](https://tailadmin.com/pricing)

### Demos

- [Free Version](https://free-react-demo.tailadmin.com/)
- [Pro Version](https://react-demo.tailadmin.com)

### Other Versions

- [HTML Version](https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template)
- [Next.js Version](https://github.com/TailAdmin/free-nextjs-admin-dashboard)
- [Vue.js Version](https://github.com/TailAdmin/vue-tailwind-admin-dashboard)
- [Angular Version](https://github.com/TailAdmin/free-angular-tailwind-dashboard)
- [Laravel Version](https://github.com/TailAdmin/tailadmin-laravel)

## Installation

### Prerequisites

To get started with TailAdmin, ensure you have the following prerequisites installed and set up:

- Node.js 20.x or later

### Cloning the Repository

Clone the repository using the following command:

```bash
git clone https://github.com/TailAdmin/free-react-tailwind-admin-dashboard.git
```

> Windows Users: place the repository near the root of your drive if you face issues while cloning.

1. Install dependencies:

    ```bash
    npm install
    # or
    yarn install
    ```

2. Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```

## Components

TailAdmin is a pre-designed starting point for building a web-based dashboard using React.js and Tailwind CSS. The
template includes:

- Sophisticated and accessible sidebar
- Data visualization components
- Prebuilt profile management and 404 page
- Tables and Charts(Line and Bar)
- Authentication forms and input elements
- Alerts, Dropdowns, Modals, Buttons and more
- FAQ & Accordion, Testimonials, and Carousels
- Can't forget Dark Mode 🕶️

All components are built with React and styled using Tailwind CSS for easy customization.

## Feature Comparison

### Free Version

- 1 Unique Dashboard
- 35+ dashboard components
- 50+ UI elements
- Basic Figma design files
- Community support

### Pro Version

- 7 Unique Dashboards: Analytics, Ecommerce, Marketing, CRM, SaaS, Stocks, Logistics (more coming soon)
- 500+ dashboard components and UI elements
- Complete Figma design file
- Email support

To learn more about pro version features and pricing, visit our [pricing page](https://tailadmin.com/pricing).

## Changelog

### Version 2.4.0 - [September 13, 2026]

- Added Internationalization (Multi Language) support.
- Updated complete template styles to support RTL.
- Added Yearly View into calendar page.
- Updated `maplibre-gl` implementation with `react-map-gl`.
- Replaced `@react-jvectormap` with `jsvectormap`.
- Added new requested components and fixed noted accessibility issues.
- Updated project structure and component compositions for easy adaption.
- Added AGENTS.md to easily work with AI Agents.
- Updated all the packages and libraries to the latest versions. Also removed unused packages.

### Version 2.3.1 - [May 23, 2026]

- Added AI Settings page to configure models, keys, and token limits.
- Added Maps page with MapLibre GL, Leaflet, and iframe styles.
- Added Vector Maps page powered by AmCharts 5 geodata (World & USA).
- Added Radar Charts page with 3 unique formats.
- Added Radial Progress Charts page featuring 4 custom layout templates.
- Introduced new Bar Charts Five & Six and Pie Charts Four & Five.

### Version 2.3.0 - [April 28, 2026]

- Added **AI Dashboard** with token usage and revenue tracking.
- Added **Sales Dashboard** with retention and multi-channel analytics.
- Added **Finance Dashboard** with cashflow and balance management.
- Introduced **6 New Layout variations** for improved UI flexibility.
- Integrated **Advanced Data Visualization** with 7+ new chart types.

### Version 2.1.0 - [Dec 30, 2025]

- Resolved Date Picker positioning and input issues in Charts.

### Version 2.0.2 - [March 25, 2025]

- Upgraded to React 19
- Included overrides for packages to prevent peer dependency errors.
- Migrated from react-flatpickr to flatpickr package for React 19 support

### Version 2.0.1 - [February 27, 2025]

#### Update Overview

- Upgraded to Tailwind CSS v4 for better performance and efficiency.
- Updated class usage to match the latest syntax and features.
- Replaced deprecated class and optimized styles.

#### Next Steps

- Run npm install or yarn install to update dependencies.
- Check for any style changes or compatibility issues.
- Refer to the Tailwind CSS v4 [Migration Guide](https://tailwindcss.com/docs/upgrade-guide) on this release. if needed.
- This update keeps the project up to date with the latest Tailwind improvements. 🚀

### Version 2.0.0 - [February 2025]

A major update with comprehensive redesign and modern React patterns implementation.

#### Major Improvements

- Complete UI redesign with modern React patterns
- New features: collapsible sidebar, chat, and calendar
- Improved performance and accessibility
- Updated data visualization using ApexCharts

#### Key Features

- Redesigned dashboards (Ecommerce, Analytics, Marketing, CRM)
- Enhanced navigation with React Router integration
- Advanced tables with sorting and filtering
- Calendar with drag-and-drop support
- New UI components and improved existing ones

#### Breaking Changes

- Updated sidebar component API
- Migrated charts to ApexCharts
- Revised authentication system

[Read more](https://tailadmin.com/docs/update-logs/react) on this release.

### Version 1.3.7 - [June 20, 2024]

#### Enhancements

1. Remove Repetition of DefaultLayout in every Pages
2. Add ClickOutside Component for reduce repeated functionality in Header Message, Notification and User Dropdowns.

### Version 1.3.6 - [Jan 31, 2024]

#### Enhancements

1. Integrate flatpickr in [Date Picker/Form Elements]
2. Change color after select an option [Select Element/Form Elements].
3. Make it functional [Multiselect Dropdown/Form Elements].
4. Make best value editable [Pricing Table One/Pricing Table].
5. Rearrange Folder structure.

### Version 1.2.0 - [Apr 28, 2023]

- Add Typescript in TailAdmin React.

### Version 1.0.0 - Initial Release - [Mar 13, 2023]

- Initial release of TailAdmin React.

## License

TailAdmin React.js Free Version is released under the MIT License.

## Support

If you find this project helpful, please consider giving it a star on GitHub. Your support helps us continue developing
and maintaining this template.
