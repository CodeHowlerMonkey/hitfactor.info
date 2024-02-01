### Howler Monkey Classification System - HMCS

Ex-USPSA Classification System Replacement. Currently read-only for analysis with more insights into data.
With addition of a Database we can add writes, that will allow import of new classifier scores.

With enough traction this can be used as a better alternative to USPSA classification system, which is plagued with questionable data and decisions.

### Repo Structure

- `api/` -- backend
- `web/` -- frontend
- `data/` -- partially processed / split data
- package.json -- monorepo wrapper scripts

For more info see READMEs in each root folder

### Running locally

```
npm i
npm start
```

### Preface

For full drama background see practical.shooting.insights on Instagram.
Long story short, the USPSA Board of Directors and employees (BOC from here forward) have been mismanaging the organization for years without any real oversight or even input from the members.
When some prominent people spoke out about it, they were banned from the organization, including multi-time National and World Champion Ben Stoeger.

Unfortunately for BOC, the bans resulted in more exposure to their actions, which led to the elections of A3D Scott Arnburg and A7D Frank Rizzi, who weren't part of the cabal and actually tried to represent the members and serve the organization. Exposure of the internal affairs of the org also made one of the leaders of BOC Area 1 Directory Bruce Gary resign, drastically shifting the power balance.

The remaining BOC members didn't like that and removed A3D from the board, which led to nationwide protests from the clubs to pause their payments to the org. BOC even tried to remove A7D but hasn't been successful yet. There's also an ongoing lawsuit against the org, which has just entered the discovery phase (January 2024).

With all this going on it's clear that the organization is in real jeopardy and might cease to exist in the near future. Additionally, with all the protests and non-payment of fees going on -- classifications aren't being updated, effectively making existing system non-functional.

And that's why this project was started.

### Technical Background

1. USPSA website is rate limited, but apparently mobile app api isn't (discovered through mobile app with sniffer app on iOS).
2. Copypasted the request into a small snippet in Chrome, data mining USPSA.org's Mobile App API.
   - Some files (hhf, divisions) taken from iOS sniffer directly.
   - Chrome shit the bed, but I was able to load all data into single file using cat (had to write shell script using `ls -1` output) and jq (simply converting it to compact and json array isntead of \n separated jsons)
   - data mined in Mid-January 2024 after removal of A7
3. First data manipulation (pie chart and classifications stats) were done in browser, then split into rudimentary node (fastify) API and simplified fronted, that takes minimum amount of data over the wire and displays the same shit.
   - Approach is quick and dirty, but reasonable.
   - database can be introduced when writes are needed, if people are interested in this
   - alternatively with enough maintainers we can keep data in indexed json files, allowing review of historical data on GitHub
