### Scripts

Various scripts that are meant to be executed in the browser as a snippet.

* uspsaScript.js - OG script used to fetch data from USPSA API

### Technical Background

1. USPSA website is rate limited, but Mobile app API isn't
    - (if it is now -- reach out to your Area Director, USPSA employees might be hostile and working against this project)
3. Copypasted the request into a small snippet in Chrome, data mining USPSA.org's Mobile App API.
   - Some files (hhf, divisions) taken from iOS sniffer directly.
   - Chrome shit the bed, Firefox worked better
   - Mac Finder and even command-line utils don't like 30k files list
   - I was able to load all data into single file using cat (had to write shell script using `ls -1` output) and jq (simply converting it to compact and json array isntead of \n separated jsons)
   - data mined in Mid-January 2024 after removal of A7 and nation-wide growing protest
4. First data manipulation (pie chart and classifications stats) were done directly in the browserd and dynamically generated and downloaded
    - later this was saved and processed in `data/` folder

