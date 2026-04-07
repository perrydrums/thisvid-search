import requests
from bs4 import BeautifulSoup

def test_url(url):
    print(f"Testing {url}")
    res = requests.get(url)
    soup = BeautifulSoup(res.text, 'html.parser')
    vids = soup.select('.tumbpu')
    print(f"Found {len(vids)} videos.")
    if vids:
        print("First video title:", vids[0].get('title', ''))

test_url('https://thisvid.com/categories/anal/1/')
test_url('https://thisvid.com/categories/anal/1/?q=teen')
