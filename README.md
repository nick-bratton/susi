# Slack Endpoints 

* ### GET users.lookupByEmail
https://api.slack.com/methods/users.lookupByEmail
https://slack.com/api/users.lookupByEmail

* ### POST chat.postMessage
https://api.slack.com/methods/chat.postMessage
https://slack.com/api/chat.postMessage

# 10K Endpoints

10K provides a dev environment called *vnext* and it provides test account credentials and a different API end point base URL. 

* Visit https://vnext.10000ft.com/signup to setup a test account.
* The API end point base URL for vnext is https://vnext-api.10000ft.com/api/v1/
* To access your test account, visit https://vnext.10000ft.com and sign in with your test account credentials.

In production, 

* Your production account is your live 10,000ft Plans account available at https://app.10000ft.com
* The API end point base URL is https://api.10000ft.com/api/v1/
* You will use a production API token obtained from the settings section in your production account.

The following endpoints will be of use:

* ### GET /api/v1/users

There's an optional parameter called *per_page* that will make life easier if it's upped from its default 20 to 80 (or whatever it is that makes sure all employees are returned on just one page).

We'll need to extract the *user_id* for each user here, to access the *time_entries* endpoint on a user-by-user basis. 

* ### GET /api/v1/time_entries?from=yyyy-mm-dd&to=yyyy-mm-dd

NOTE: Suggested time entries are not returned by the API by default and must be requested using the with_suggestions=true parameter on the GET API call to fetch time entries. This endpoint avoids making a call user-by-user and the returned *time_entries* objects do come with a field *user_id*. The issue here, is that the user_id is decoupled from the email address that will be used to direct messages to people on Slack. 

A better solution to the one above, would be to get unconfirmed entries for a time period and for each one, store the *user_id* locally. Then, look up the email addresses associated with those *user_id*s and then have the Slack bot ping them.

* ### PUT /api/v1/users/<user_id>/time_entries/id

Let's see if we can confirm time entries by hitting this endpoint. 


# Open Tasks

1. Handle [pagination](https://github.com/10Kft/10kft-api/blob/master/sections/first-things-first.md#pagination) in 10000ft responses. Note the '&per_page=500' in the exports.uriToCheckWeeklyTimeEntries() in tenK.js. 500 was chosen as its well above what we could expect in a given week (i.e., 80 employees * 7 time entries in a week = 500 results). We should never have more than one page returned then. This is solution for the time being only. What would be better would be to handle pagination dynamically.
2. Move out of sandboxes
3. Use ENV instead of locally stored keys 
4. Message interactivity (securely confirming hours on Slack)
    * However, it seems we [may not be able](https://github.com/10Kft/10kft-api/blob/master/sections/time-entries.md#time-entries-and-resource-only-users) to confirm time entries from the API. 