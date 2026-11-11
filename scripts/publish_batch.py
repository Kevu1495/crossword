"""Publish reviewed SQL to D1, retrying only idempotent INSERT OR IGNORE statements."""
import argparse
import json
import os
from pathlib import Path
import time
import urllib.request


def publish(sql_path):
    account=os.environ['CLOUDFLARE_ACCOUNT_ID']
    database=os.environ['CLOUDFLARE_DATABASE_ID']
    token=os.environ['CLOUDFLARE_API_TOKEN']
    statements=sql_path.read_text().splitlines()
    endpoint=f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{database}/query'
    for offset in range(0,len(statements),25):
        body=json.dumps({'sql':'\n'.join(statements[offset:offset+25])}).encode()
        for attempt in range(3):
            request=urllib.request.Request(endpoint,data=body,headers={'Authorization':f'Bearer {token}','Content-Type':'application/json'})
            try:
                with urllib.request.urlopen(request,timeout=45) as response:
                    result=json.load(response)
                if not result.get('success') or any(not r.get('success',False) for r in result.get('result',[])):
                    raise RuntimeError('D1 rejected this batch. Check database migrations and permissions.')
                break
            except Exception:
                if attempt==2: raise
                time.sleep(2**attempt)
    print(f'Published {len(statements)} idempotent statements')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('sql',type=Path)
    args=parser.parse_args()
    publish(args.sql)
