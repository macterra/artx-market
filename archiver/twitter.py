from requests_oauthlib import OAuth1Session
import os
import json

def tweet(msg):
    consumer_key = os.environ.get("X_API_KEY")
    consumer_secret = os.environ.get("X_API_SECRET")
    access_token = os.environ.get("X_BOT_KEY")
    access_secret = os.environ.get("X_BOT_SECRET")

    if not all([consumer_key, consumer_secret, access_token, access_secret]):
        raise Exception('All environment variables (X_API_KEY, X_API_SECRET, X_BOT_KEY, X_BOT_SECRET) must be set.')

    payload = { "text": msg }

    oauth = OAuth1Session(
        consumer_key,
        client_secret=consumer_secret,
        resource_owner_key=access_token,
        resource_owner_secret=access_secret,
    )

    response = oauth.post("https://api.twitter.com/2/tweets", json=payload)

    if response.status_code != 201:
        raise Exception(f"Request returned an error: {response.status_code} {response.text}")

    return response.json()

if __name__ == "__main__":
    print(tweet("testing 1..2..3..4..5..6..7"))
