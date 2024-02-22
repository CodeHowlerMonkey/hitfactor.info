### Howler Monkey Classification System - HMCS

Independent Frontend/Webapp to bring better analysis and transparency into the USPSA Classification System.
Currently, read-only, uploads planned (See issue #1)

### Preface

For a full drama background, see practical.shooting.insights on Instagram.
Long story short, the USPSA Board of Directors and employees (BOC from here forward) have been mismanaging the organization for years without any real oversight or even input from the members.
When some prominent people spoke out about it, they were banned from the organization, including multi-time National and World Champion Ben Stoeger.

Unfortunately for the BOC, the bans resulted in more, not less, exposure to their actions, which led to the elections of A3D Scott Arnburg and A7D Frank Rizzi, who weren't part of the cabal and tried to represent the members and serve the organization. 
Exposure to the internal affairs of the org also made one of the leaders of BOC Area 1 Director, Bruce Gary, resign, drastically shifting the power balance.

The remaining BOC members didn't like that and removed A3D from the board, which led to nationwide protests from the clubs to pause their payments to the org. BOC even tried to remove A7D but hasn't been successful yet. There's also an ongoing lawsuit against the org, which has just entered the discovery phase (January 2024).

With all this going on, it's clear that the organization is in real jeopardy and might cease to exist soon. 
Additionally, with all the protests and non-payment of fees going on -- the classifications aren't being updated, effectively making the existing system non-functional.

And that's why this project was started.


#### Current (Minimum) Goal 
Analyze all available classifier data (scores, hhf, divisions, shooters, etc.) and come up with a list of recommended changes for USPSA to implement.

#### Maximum Goal
Integrate into USPSA.org and fix the classification system after membership/clubs demands are satisfied and the protest is over. 

#### Alternative Goal
In case of non-cooperation from USPSA leadership and/or loss of the org, create an independent, free, open-source, and easy-to-use classification system that can be used instead of the old one.

##### Technical Stack

* Main language: JavaScript (ES13)
* Monorepo, Node/Fastify Backend, React (vite-swc) Frontend.
* Backend serves API and static files: (build of React Frontend, downloadables, etc)
* All data is loaded on node process startup; no database

##### Folder Structure

- `data/` -- partially processed / split data
- `api/` -- backend
- `web/` -- frontend
- package.json -- monorepo wrapper scripts

For more info, see READMEs in each root folder

### Running locally

```
npm i
npm start
```
