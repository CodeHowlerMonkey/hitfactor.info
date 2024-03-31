### Howler Monkey Classification System - HMCS

Independent Frontend/Webapp to bring better analysis and transparency into the USPSA Classification System.
For a full drama background, see practical.shooting.insights on Instagram.
For a quick-ish TLDR: see [DRAMA.md](DRAMA.md)
Currently read-only, uploads planned (See issue #1)

#### Project Goals.

1. Analyze existing historical data and provide recommended HHF for all classifiers/divisions.
2. Implement classification calculation and serve as an alternative shooter's classification source for expired members / shooters in protesting clubs.
3. Implement alternative classification methods (percentiles, fluctuating, etc) for measuring shooter's skill
4. Provide documentation and insight into classification system and present it to USPSA BOD after malicious actors are removed from the management.
5. Integrate into USPSA.org website

#### Running

##### Locally - All Data

```
npm i
npm start
```

(Takes minute+ to hydrate the data and become responsive on M1Pro)

##### Locally - Quick Mode

For faster turn around when developing API, use:

```
npm i
npm run quick
```

(Hydrates in less than 5 seconds)

###### In Production

Dockerfile is only used by Koyeb. To run in prod mode, use:

```
npm i
npm run prod
```

Note: `npm` i is required, because it uses vite build as a post-install step and serves frontend files from the node itself, instead of running two processes concurrently.

##### Technical Stack

- Main language: JavaScript (ES13), TypeScript when needed
- Monorepo, Node/Fastify Backend, React (vite-swc) Frontend.
- Backend serves API and static files: (build of React Frontend, downloadables, etc)
- All data is loaded on node process during startup; no database (yet)

##### Folder Structure

- `scripts/` -- standalone scripts
- `data/` -- imported (partially processed / split) data, mostly used by backend
- `shared/` -- source code imported by both front- and backend
- `api/` -- backend
- `web/` -- frontend
- package.json -- monorepo wrapper scripts

For more info, see READMEs in each root folder

### Importing Data from USPSA

First you need to obtain and set ENV variables for API keys

- ZenRows: use https://www.zenrows.com, set as ZENROWS_API_KEY
- USPSA: you need Uspsa-Api header from mobile app, set as USPSA_API_KEY

Then run `npm run import`
Usually takes a couple of hours on a pretty mediocre connection.
Classifications and classifiers each have 258+ slices of 256 requests, each successful request is marked with a dot in the stdout. ZenRows still have (although rare) failures, usually manually refetching the slice with the failure by manually editing import.js is good enough.

Make sure to pay attention to git diff when comitting imports, ideally it should only have additions.
