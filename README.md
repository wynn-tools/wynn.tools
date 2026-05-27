<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->

[![CI][ci-shield]][ci-url]
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/wynn-tools/wynn.tools">
    <img src="public/favicon.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">wynn.tools</h3>

  <p align="center">
    Open source Wynncraft tools — Builder and Map, with more on the way.
    <br />
    <a href="https://wynn.tools"><strong>Open the app »</strong></a>
    <br />
    <br />
    <a href="https://github.com/wynn-tools/wynn.tools/issues/new?labels=bug&template=bug_report.yml">Report Bug</a>
    &middot;
    <a href="https://github.com/wynn-tools/wynn.tools/issues/new?labels=enhancement&template=feature_request.yml">Request Feature</a>
    &middot;
    <a href="https://discord.gg/tKPdvKdfJq">Discord</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

**wynn.tools** is a community-built toolkit for [Wynncraft](https://wynncraft.com), a Minecraft MMORPG. It brings together the tools players need most under one roof with a sharing layer for builds, routes, and overlays.

**Tools:**

- **Builder** — Plan builds, assign skill points, compare gear.
- **Map** — Explore the Province of Wynn with live location data.

**Coming next:**

- **Accounts** — Save builds, lootrun routes, and Wynntils overlays to your profile. Share anything with one link.
- **Sharing** — Permanent links for everything you save. People see exactly what you built, not a screenshot of it.
- **Overlays** — A community library of Wynntils HUD functions. Find what others have built instead of asking in Discord.
- **API access** — Bots, spreadsheets, and external tools can pull live data from wynn.tools endpoints.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- [![Nuxt][Nuxt.js]][Nuxt-url]
- [![Vue][Vue.js]][Vue-url]
- [![TypeScript][TypeScript]][TypeScript-url]
- [![TailwindCSS][TailwindCSS]][Tailwind-url]
- [![Vite][Vite]][Vite-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

```sh
npm install -g pnpm
```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/wynn-tools/wynn.tools.git
   cd wynn.tools
   ```
2. Install dependencies
   ```sh
   pnpm install
   ```
3. Start the dev server
   ```sh
   pnpm dev
   ```
   The app will be available at `http://localhost:3000`.

**Other commands:**

```sh
pnpm build      # production build
pnpm test:run   # run all tests
pnpm lint:fix   # lint and auto-fix
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Contributions are welcome and greatly appreciated. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR, and follow the [Code of Conduct](.github/CODE_OF_CONDUCT.md). To report a security vulnerability, see [SECURITY.md](.github/SECURITY.md).

All commits require a DCO sign-off (`git commit -s`).

1. Fork the project
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -s -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

### Top contributors

<a href="https://github.com/wynn-tools/wynn.tools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=wynn-tools/wynn.tools" alt="Contributors" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the AGPL-3.0 License. See [`LICENSE`](LICENSE) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [WynnBuilder](https://github.com/wynnbuilder-beta/wynnbuilder-beta.github.io) — builder calculations reference
- [Wynntils](https://github.com/Wynntils/Wynntils) — map icon assets and CDN mirror
- [Wynncraft](https://wynncraft.com) — the game that makes all of this possible

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Join the community on [Discord](https://discord.gg/tKPdvKdfJq) or open an [issue](https://github.com/wynn-tools/wynn.tools/issues).

Project Link: [https://github.com/wynn-tools/wynn.tools](https://github.com/wynn-tools/wynn.tools)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->

[ci-shield]: https://img.shields.io/github/actions/workflow/status/wynn-tools/wynn.tools/ci.yml?style=for-the-badge&label=CI
[ci-url]: https://github.com/wynn-tools/wynn.tools/actions/workflows/ci.yml
[contributors-shield]: https://img.shields.io/github/contributors/wynn-tools/wynn.tools.svg?style=for-the-badge
[contributors-url]: https://github.com/wynn-tools/wynn.tools/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/wynn-tools/wynn.tools.svg?style=for-the-badge
[forks-url]: https://github.com/wynn-tools/wynn.tools/network/members
[stars-shield]: https://img.shields.io/github/stars/wynn-tools/wynn.tools.svg?style=for-the-badge
[stars-url]: https://github.com/wynn-tools/wynn.tools/stargazers
[issues-shield]: https://img.shields.io/github/issues/wynn-tools/wynn.tools.svg?style=for-the-badge
[issues-url]: https://github.com/wynn-tools/wynn.tools/issues
[license-shield]: https://img.shields.io/github/license/wynn-tools/wynn.tools.svg?style=for-the-badge
[license-url]: https://github.com/wynn-tools/wynn.tools/blob/main/LICENSE
[Nuxt.js]: https://img.shields.io/badge/Nuxt-002E3B?style=for-the-badge&logo=nuxtdotjs&logoColor=#00DC82
[Nuxt-url]: https://nuxt.com/
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Vite]: https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E
[Vite-url]: https://vitejs.dev/
