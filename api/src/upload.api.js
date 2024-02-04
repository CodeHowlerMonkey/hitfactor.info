// TODO: looks like we can just operate off a practiscore link:
// https://practiscore.com/results/new/UUID
// and then request 2 json files from S3 bucket:
// 1. https://s3.amazonaws.com/ps-scores/production/UUID/results.json
// 1. https://s3.amazonaws.com/ps-scores/production/UUID/match_def.json
//
// match_def has info about the shooter, which will allow linking shooter results to their USPSA number
// it also marks which stage is a classifier and what is the code/number
// then we can just filter through results and get data we need
//
//
