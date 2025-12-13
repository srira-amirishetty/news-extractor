import requests
import feedparser
from newsplease import NewsPlease

# 1. The Hindu RSS feed URL
RSS_URL = "https://www.thehindu.com/news/national/feeder/default.rss"

# 2. Download the feed
print("Fetching RSS feed...")
feed = feedparser.parse(RSS_URL)

print(f"Found {len(feed.entries)} articles")

# Optional custom headers (sets a real browser UA)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36"
}

# 3. Loop through entries
for entry in feed.entries:
    url = entry.link
    print("\nFetching article:", url)

    # 4. Download page HTML
    response = requests.get(url, headers=HEADERS)

    if response.status_code != 200:
        print("❌ Failed to fetch:", response.status_code)
        continue

    html = response.text

    # 5. Extract article with news-please
    article = NewsPlease.from_html(html, url=url)

    if not article or not article.maintext:
        print("❌ Could not extract content")
        continue

    print("TITLE:", article.title)
    print("DATE:", article.date_publish)
    print("TEXT SNIPPET:", (article.maintext[:200] + "...") if article.maintext else "")

    # Save to file
    filename = url.rstrip("/").split("/")[-1] + ".txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write("TITLE: " + str(article.title) + "\n")
        f.write("DATE: " + str(article.date_publish) + "\n\n")
        f.write(article.maintext)

    print("Saved:", filename)
