### Scripts

Various scripts that are meant to be executed in the browser as a snippet.

- uspsaScript.js - OG script used to fetch data from USPSA API, used as a snippet with browser sitting on api.uspsa.org/api/app
- import.js - new node import script, that uses USPSA->PractiScore txt file for meta and zenrows for fetching HQ data.

### Why ZenRows is necessary

uspsa.org is using cloudflare, and while mobile api isn't rate limited, some automatic checks prevent node scripts from easily scraping everything. Which looks like HTML being returned, even from the API endpoint.

Thanks to @jrdoran for telling me about ZenRows
