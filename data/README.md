- `classifiers/`
  - pdfs - official WSBs and stage diagrams for all classifiers
  - jpgs - previews of pdfs for classifer pages
  - index.json - list of classifiers, as-is again from USPSA.org mobile api
- merged.active.[DIVISION].[NUMBER].json -- much more reasonable split into divisions
  - NUMBER is optional, used when json file needed to be split
- activeMembers.js -- just member numbers of active members
- division.json -- as-is meta data for divisions, pretty much useless, but historical reasons
- hhf.json -- all data used for classifier calculator, official HHFs (yummy, can't wait to compare this shit to historical official runs)

### Removed from the repo due to size

    * merged.active.json -- 800MB data blob filtered into active members only, all classifier runs
