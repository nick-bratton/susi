# Open Tasks

1. Handle [pagination](https://github.com/10Kft/10kft-api/blob/master/sections/first-things-first.md#pagination) in 10000ft responses. Note the '&per_page=500' in the exports.uriToCheckWeeklyTimeEntries() in tenK.js. 500 was chosen as its well above what we could expect in a given week (i.e., 80 employees * 7 time entries in a week = 500 results). We should never have more than one page returned then. This is solution for the time being only. What would be better would be to handle pagination dynamically.
