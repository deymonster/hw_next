# [1.0.0-alpha.7](https://github.com/deymonster/hw_next/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2025-10-01)


### Features

* **auth:** improve email verification flow with better error handling ([a195634](https://github.com/deymonster/hw_next/commit/a1956346a09057631605237a051bcf5ce308ecfe))

# [1.0.0-alpha.6](https://github.com/deymonster/hw_next/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2025-09-29)


### Features

* add database health check and error handling ([c59d92e](https://github.com/deymonster/hw_next/commit/c59d92eb1065463719baa3cc0334a0d329d926cf))

# [1.0.0-alpha.5](https://github.com/deymonster/hw_next/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2025-09-25)


### Bug Fixes

* use proper release tags instead of date-based tags for Docker images ([8bfc780](https://github.com/deymonster/hw_next/commit/8bfc7806832625bf8c617eaae94e43f16b2a650d))

# [1.0.0-alpha.4](https://github.com/deymonster/hw_next/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2025-09-25)


### Bug Fixes

* **ci:** exclude CHANGELOG.md from prettier formatting ([0a43eeb](https://github.com/deymonster/hw_next/commit/0a43eebd5ac04df3589b66eda76c30e3e0ab8f3c))

# [1.0.0-alpha.3](https://github.com/deymonster/hw_next/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2025-09-25)

### Bug Fixes

- **ci:** improve workflow_run trigger for docker-build ([ab28691](https://github.com/deymonster/hw_next/commit/ab286912d11f2e0e383cb49bb9a1e3e5dde276c5))

# [1.0.0-alpha.2](https://github.com/deymonster/hw_next/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2025-09-25)

### Features

- **docker:** add workflow_run trigger and version handling ([73da79b](https://github.com/deymonster/hw_next/commit/73da79b6329790fe3f0863658b565f8315797ba6))

# 1.0.0-alpha.1 (2025-09-23)

- feat!: initial licensing alpha ([0a36a74](https://github.com/deymonster/hw_next/commit/0a36a74466293df091ecf50208d80ab38d661431))

### Bug Fixes

- **auth:** remove domain from cookies and update nginx server name ([f856cb0](https://github.com/deymonster/hw_next/commit/f856cb0776e987a9ce7dd7ca6636665d56148c6d))
- **auth:** remove leading dot from cookie domain in production ([6f9e9eb](https://github.com/deymonster/hw_next/commit/6f9e9eb4211dd9673a404cbf36035854b8b65563))
- **auth:** set cookie domain based on environment ([d79d782](https://github.com/deymonster/hw_next/commit/d79d7822f3fb83881f3856fbd8dee18230279dbc))
- **auth:** set cookie domain for production environment ([36ead5c](https://github.com/deymonster/hw_next/commit/36ead5c943f146d26caddc569c9fc27e0438e654))
- **auth:** simplify cookie domain configuration ([e0e6b22](https://github.com/deymonster/hw_next/commit/e0e6b22c47cb60787c3c9c2352840599a46ac17b))
- **ci:** fix workflow yaml indentation; remove \*.go ignore; pass licd build args ([2df84a5](https://github.com/deymonster/hw_next/commit/2df84a5a949f1df19e1b93877700f0a940000e6d))
- correct syntax for NEXT_PUBLIC_GIT_COMMIT env variable ([ae922aa](https://github.com/deymonster/hw_next/commit/ae922aa76f09df458a877383f28b4395ac382f3a))
- improve SSE streaming and metrics parsing. 1. Fix SSE stream logic (simplify stream handling, fix headers). 2. Fix process metrics naming typos. 3. Enhance process list parsing and sorting. ([b3fdf58](https://github.com/deymonster/hw_next/commit/b3fdf58033e725ad051ab3f66bd6bb0081178b38))
- multiple device selection in ScanTable and DataTable components ([dd1418a](https://github.com/deymonster/hw_next/commit/dd1418a33515ede78dbda4bcc544a0a78b4844db))
- **prometheus:** ensure proper permissions for shared config directory ([a98d27a](https://github.com/deymonster/hw_next/commit/a98d27a406a78e6cae6b405f69a1b836747ee440))
- update prometheus upstream server hostname ([17f01db](https://github.com/deymonster/hw_next/commit/17f01dbb16838eb2a3cd79174f10aa58942ce503))

### Features

- add database migrations and update prometheus config ([cc65a6c](https://github.com/deymonster/hw_next/commit/cc65a6ca70cb7abbaf8ce662aae59aa1fea71a33))
- **alert-rules:** add alert rule creation with presets and validation ([12e4698](https://github.com/deymonster/hw_next/commit/12e4698fb39e887d4e1c808f12cfcb0ff60a4c03))
- **alert-rules:** add detail view with edit and duplicate functionality ([b4d6667](https://github.com/deymonster/hw_next/commit/b4d6667a17bc1ab1ce11fc0ba597552e3c34ec85))
- **alert-rules:** add duplicate rule validation and UI enhancements ([799a186](https://github.com/deymonster/hw_next/commit/799a186bf3b4c6c7aafcea625e131e96400d4343))
- **alert-rules:** add edit and duplicate functionality for alert rules ([9c0828d](https://github.com/deymonster/hw_next/commit/9c0828d9749323957840cbcd7c09602455011077))
- **alert-rules:** add fallback option for metric translation ([914a5b6](https://github.com/deymonster/hw_next/commit/914a5b6e63fc6f548949022ff4661be815fbb77e))
- **alert-rules:** improve responsive design for alert rules and events tables ([4a338a7](https://github.com/deymonster/hw_next/commit/4a338a776029695fd1420b8a600a24e75b73fcfd))
- **alert:** add alert services and interfaces ([de7b17d](https://github.com/deymonster/hw_next/commit/de7b17d5eed92e5a0007acee64f6f5e4b5004931))
- **alerting:** add alert rules management system ([a09060f](https://github.com/deymonster/hw_next/commit/a09060f1f013d7d137a0b69461c47da7fe001094))
- **alerting:** add hardware change detection and improve alert processing ([e39554f](https://github.com/deymonster/hw_next/commit/e39554f74a4d9c3569ff417cc674e80187f80c02))
- **alerts:** implement alert processing and notification system ([2bcf403](https://github.com/deymonster/hw_next/commit/2bcf403e8651d0b9e2c2179d5214517027f10f53))
- **auth:** implement enhanced session management and user state synchronization ([8c1dbfb](https://github.com/deymonster/hw_next/commit/8c1dbfbbb7537d050b81afdda21b07738a5a0be1))
- **auth:** update logout redirect to home page and improve landing page ([aa2e257](https://github.com/deymonster/hw_next/commit/aa2e2579d6da886aa33f1f0adc3b7b6ca604ccf5))
- **ci:** update GitHub workflows for release and docker build ([cc8d86a](https://github.com/deymonster/hw_next/commit/cc8d86a514fbe36794f728ab4eb42071a955f57a))
- **config:** add CORS headers and update auth/proxy configs ([16eddab](https://github.com/deymonster/hw_next/commit/16eddab967e8182a788a50731676e761dd5aa09c))
- **config:** add server ip env variable for image optimization ([5514020](https://github.com/deymonster/hw_next/commit/551402052ede40241c80c6bf81e81ca17f44b376))
- **DataTable:** add loading and empty state messages ([69989fb](https://github.com/deymonster/hw_next/commit/69989fb067c5b4dee2c16cb483bd82627efd9578))
- **department/employee:** add department and employee services and relations ([407c7bb](https://github.com/deymonster/hw_next/commit/407c7bbb99fd2aaa69b9f8c64c9b262facac2a75))
- **department:** add department actions and custom hook ([5ef7e1d](https://github.com/deymonster/hw_next/commit/5ef7e1d807ec9829286c394eaebe37f9c564ef6d))
- **department:** add device management functionality ([c9b20d5](https://github.com/deymonster/hw_next/commit/c9b20d5d142bcada26df7024fdf709c8dcb98b98))
- **department:** add employees count to department data ([5be2e1a](https://github.com/deymonster/hw_next/commit/5be2e1a5440c3d2b20b9d4bfa95b5adf1806bff8))
- **departments:** add department detail view ([c0e9a04](https://github.com/deymonster/hw_next/commit/c0e9a04964907691626826cff9c44600bbb2dd69))
- **departments:** add departments management feature with device count ([bd2f24b](https://github.com/deymonster/hw_next/commit/bd2f24b97ba053bfc3cfc36e91d1dd38a1da9855))
- **departments:** add edit department functionality ([295a13d](https://github.com/deymonster/hw_next/commit/295a13d116f0141a7a4b3d1356a5d6806be81e61))
- **departments:** add employees count column to departments table ([f1cd033](https://github.com/deymonster/hw_next/commit/f1cd03332e7c3731a26239beeb2f579fa783a57e))
- **device:** add hardware change confirmation flow ([68c678f](https://github.com/deymonster/hw_next/commit/68c678fff8ad5d55cf313c8aa9876a9b47000da1))
- **device:** add OR filter option for department IDs ([d3a19cd](https://github.com/deymonster/hw_next/commit/d3a19cdfc4a4f8c5c7dff0cc8a6b107d7518e2b7))
- **devices:** add bulk warranty update and selection functionality ([65f261d](https://github.com/deymonster/hw_next/commit/65f261da3afe9c62e85c5b563312229228cddffb))
- **devices:** add warranty status management functionality ([a2e98af](https://github.com/deymonster/hw_next/commit/a2e98afca984b46cae9f69d66ebf26b8c63f0f59))
- **devices:** enhance hardware and performance metrics display ([6e53e1c](https://github.com/deymonster/hw_next/commit/6e53e1cd3e7f1388648af00dbbea6ec7a29610a2))
- **employee-detail:** add localization support for employee detail component ([c79eb6a](https://github.com/deymonster/hw_next/commit/c79eb6ae8a6bc9374174da9f0a1d661a4afa9680))
- **employee-table:** add filter functionality to employee name column ([d68b942](https://github.com/deymonster/hw_next/commit/d68b9421d28f4c6d6addfffb6314dc3eb2581db9))
- **employee:** add device management functionality ([5d9270e](https://github.com/deymonster/hw_next/commit/5d9270e65b3fbbc14e138ac0eb263c8cfa3063eb))
- **employee:** add employee detail view and edit functionality ([9e4fc6e](https://github.com/deymonster/hw_next/commit/9e4fc6e3be29dfb24d726f0405abb1093b13d041))
- **employee:** add employee management feature ([278c88f](https://github.com/deymonster/hw_next/commit/278c88fd5e43ff48912ab0a7769cd8d9c988e086))
- **event:** add pagination and sorting to event queries ([67a6f8b](https://github.com/deymonster/hw_next/commit/67a6f8b34cb99f1cc9dddd154afce7d61880198d))
- **events:** add event detail view and mark as read functionality ([da0ec84](https://github.com/deymonster/hw_next/commit/da0ec849bc580fe346230452924118661b186107))
- **events:** implement useEvents hook and refactor event handling ([49221c7](https://github.com/deymonster/hw_next/commit/49221c7fc57df6040b6b99f2f06d885d97b65cb1))
- **hardware-change:** implement hardware change confirmation flow ([f27a662](https://github.com/deymonster/hw_next/commit/f27a662bf5f5b89de5bd99b84759943f072d7486))
- **i18n:** add translations for device detail components ([ef3ff50](https://github.com/deymonster/hw_next/commit/ef3ff50ba9eca574b5a95f03e3f83aa7b7af1233))
- implement optimistic updates for device deletion - Add optimistic UI updates using React Query cache - Remove redundant state updates in useDevices hook - Improve UX by showing immediate feedback ([44b717e](https://github.com/deymonster/hw_next/commit/44b717e44dd2464e9abfe887c46c3988539bfdf7))
- increase file upload limits and improve logging ([a6fa844](https://github.com/deymonster/hw_next/commit/a6fa8442d7c676bcfe5f1dbc52a84e200294154d))
- **inventory:** add async item addition and deduplication ([3530f76](https://github.com/deymonster/hw_next/commit/3530f761b870d9de83c714a46c83c4841771ba5e))
- **inventory:** add create inventory button and modal ([481e18a](https://github.com/deymonster/hw_next/commit/481e18afef77bf22c2e245ebd6617735bd77f742))
- **inventory:** add date range filter to inventory table ([9a8d79a](https://github.com/deymonster/hw_next/commit/9a8d79aef9c3d8e68a524f0b928061810dc26769))
- **inventory:** add department selection step to inventory creation modal ([e50ed5e](https://github.com/deymonster/hw_next/commit/e50ed5e865d6285455cb11941119a8307f694b5f))
- **inventory:** add department support to inventory creation ([7bd0260](https://github.com/deymonster/hw_next/commit/7bd02602b279f25dafbbd2cc8276e5385faf13ee))
- **inventory:** add device selection step to inventory modal ([197d391](https://github.com/deymonster/hw_next/commit/197d3916659816a0ce7d1cb64bbd3bcde6b88194))
- **inventory:** add employee and department tracking for devices ([55c7a55](https://github.com/deymonster/hw_next/commit/55c7a5510d573443499ef365fac8e243a13cbe02))
- **inventory:** add final step to inventory creation process ([3a03f0a](https://github.com/deymonster/hw_next/commit/3a03f0afdda094f32de636cab56c85d7a750e504))
- **inventory:** add hardware info collection for inventory creation ([d55d645](https://github.com/deymonster/hw_next/commit/d55d6455ce8aaed1a4d6fd20aacf350a37361627))
- **inventory:** add inventory detail view and export functionality ([53829ae](https://github.com/deymonster/hw_next/commit/53829aea3347f380e734be756048de77a06d381c))
- **inventory:** add inventory management feature with table, actions, and hooks ([744d93e](https://github.com/deymonster/hw_next/commit/744d93e9109aa2415030917d2405ff700d6e2dfb))
- **inventory:** add inventory service, action and related models ([41b9907](https://github.com/deymonster/hw_next/commit/41b9907a1329bc0f8cdc0ece2d72666a5485a177))
- **inventory:** add loading state and validation to department selection ([6f796e0](https://github.com/deymonster/hw_next/commit/6f796e0637ee8aef3ebb542d814c9f324db43def))
- **inventory:** add useInventory hook for managing inventory ([97f6a03](https://github.com/deymonster/hw_next/commit/97f6a03f680792f1eb176007f260043a66592896))
- **licd:** add batch activation support and improve device handling ([145fddf](https://github.com/deymonster/hw_next/commit/145fddfab937dd10ca0042a9a23108f246d0ae56))
- **licd:** add version info and build flags to Dockerfile and Makefile ([a49a391](https://github.com/deymonster/hw_next/commit/a49a3911672b6307aad32fb994fde982a57db4d6))
- **licensing:** implement device activation and licensing system ([a26b59f](https://github.com/deymonster/hw_next/commit/a26b59fbaa14d9c8767c64801ccdd7a4d50116e0))
- **licensing:** initial alpha release ([9ec26ee](https://github.com/deymonster/hw_next/commit/9ec26ee2048312a32a179ee1def61ac17c1fe894))
- **logger:** implement centralized logging across services ([a2a3246](https://github.com/deymonster/hw_next/commit/a2a3246f2ffd45c7ac5a5854ee8096769b63783f))
- **metrics:** add new process group metrics and refactor process parsing ([4063c94](https://github.com/deymonster/hw_next/commit/4063c948d017d71efa265f1d1c5ef0562d9e21e6))
- **metrics:** add process metrics and WebSocket integration for real-time monitoring ([acfa3a2](https://github.com/deymonster/hw_next/commit/acfa3a2c54448f15a3be2cd4e981f3101908a888))
- **metrics:** standardize network and disk I/O speed formatting ([fbfa647](https://github.com/deymonster/hw_next/commit/fbfa647d64aa36e0d466225c590495504d27aa94))
- **monitoring:** add monitoring feature with alert rules and events ([344844a](https://github.com/deymonster/hw_next/commit/344844a521fb0d6971b1ffa2999af7c179dd3c8c))
- **network:** use env vars for server IP in production ([2d0ee7d](https://github.com/deymonster/hw_next/commit/2d0ee7dff340d5bcc90c9290111b97ef51a42f6f))
- **nginx:** add combined nginx configuration and docker setup ([1fe6e0d](https://github.com/deymonster/hw_next/commit/1fe6e0dcb5b5cce4c79e0fa421903f600e5cfcbd))
- **prometheus:** implement config sync via API and refactor target management ([4c3711d](https://github.com/deymonster/hw_next/commit/4c3711d868eb9e3613aecd69a7761cc179f53ca5))
- **ui:** add ModalForm component and update styles ([87559a0](https://github.com/deymonster/hw_next/commit/87559a0798fe4c7998a47d8282f30017ba490128))

### BREAKING CHANGES

- start alpha releases on feature/licensing-system
