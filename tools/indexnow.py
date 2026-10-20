"""Tell IndexNow (Bing, and the engines that share it) which pages of telaioconsulting.com changed.

Run it from the repository root once the change is live on the site:
    python tools/indexnow.py                                  # every URL of sitemap.xml
    python tools/indexnow.py https://telaioconsulting.com/chi-siamo/   # one or more URLs
    python tools/indexnow.py sitemap.xml https://telaioconsulting.com/ecommerce-automations/sitemap.xml

An argument ending in .xml is a sitemap (a local file or an https address) and stands for
every <loc> it lists. The key is read from the <key>.txt file at the site root, the only
place it lives together with the README. Submit URLs that changed, are new or were removed:
IndexNow is a change notice, not a crawl request. Answer 200 or 202 = accepted.
"""
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

HOST = "telaioconsulting.com"
ENDPOINT = "https://api.indexnow.org/indexnow"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEANING = {
    200: "OK, URLs submitted",
    202: "Accepted, key check pending",
    400: "bad request",
    403: "key not valid (key file missing or with another content)",
    422: "URLs not of this host, or key does not match the file",
    429: "too many requests",
}


def read_key():
    files = [f for f in glob.glob(os.path.join(ROOT, "*.txt"))
             if re.fullmatch(r"[0-9a-f]{32}\.txt", os.path.basename(f))]
    if len(files) != 1:
        sys.exit("Expected exactly one <32 hex characters>.txt key file at the site root, found "
                 f"{len(files)}.")
    return os.path.basename(files[0])[:-4]


def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def urls_of(sitemap):
    if sitemap.startswith("https://"):
        xml = fetch(sitemap)
    else:
        with open(os.path.join(ROOT, sitemap), encoding="utf-8") as f:
            xml = f.read()
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)


def main(args):
    key = read_key()
    key_location = f"https://{HOST}/{key}.txt"
    try:
        live = fetch(key_location).strip()
    except urllib.error.HTTPError as e:
        sys.exit(f"{key_location} answers HTTP {e.code}: wait for GitHub Pages to publish the key file.")
    if live != key:
        sys.exit(f"{key_location} does not contain the key: nothing sent.")

    urls = []
    for arg in args or ["sitemap.xml"]:
        urls += urls_of(arg) if arg.endswith(".xml") else [arg]
    urls = list(dict.fromkeys(urls))
    foreign = [u for u in urls if not u.startswith(f"https://{HOST}/")]
    if foreign:
        sys.exit("Only https://" + HOST + "/ URLs can be submitted: " + ", ".join(foreign))
    if not urls:
        sys.exit("No URL to submit.")

    body = json.dumps({"host": HOST, "key": key, "keyLocation": key_location, "urlList": urls})
    request = urllib.request.Request(ENDPOINT, data=body.encode("utf-8"), method="POST",
                                     headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(request, timeout=30) as r:
            status, text = r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode("utf-8", "replace")

    print(f"{len(urls)} URL(s) -> {ENDPOINT}: HTTP {status} {MEANING.get(status, '')}".rstrip())
    for u in urls:
        print("  " + u)
    if text.strip():
        print(text.strip())
    sys.exit(0 if status in (200, 202) else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
