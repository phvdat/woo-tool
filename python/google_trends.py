from trendspy import Trends
import json
import sys

# Ép stdout/stderr dùng UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

trends = Trends()
data = trends.trending_now(geo="US")

result = [
    {
        "keyword": item.keyword,
        "traffic": item.volume,
    }
    for item in data
]

print(json.dumps(result, ensure_ascii=False))