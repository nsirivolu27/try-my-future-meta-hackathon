"""Build an offline campus directory and SQLite database from official IPEDS HD2025.

Usage: python scripts/import-directory.py [--download]
No third-party Python packages. Validate before atomically replacing outputs.
"""
import csv
import hashlib
import io
import json
import sqlite3
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
URL = 'https://nces.ed.gov/ipeds/complete-data-files/HD2025.zip'
STATES = set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI'.split())
CURATED = {'110680': 'ucsd', '228778': 'ut', '234076': 'uva'}

def safe_url(value):
    value = value.strip()
    if not value or value.startswith('-'):
        return ''
    if '://' not in value:
        value = 'https://' + value
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or '.' not in parsed.hostname or parsed.username or any(c.isspace() for c in value):
            return ''
        return urlunsplit(('https', parsed.netloc, parsed.path, parsed.query, parsed.fragment))
    except ValueError:
        return ''

def coordinate(value, limit):
    try:
        number = float(value)
        return number if -limit <= number <= limit and number != 0 else None
    except ValueError:
        return None

def main():
    raw = ROOT / 'data/raw/HD2025.zip'
    raw.parent.mkdir(parents=True, exist_ok=True)
    if '--download' in sys.argv:
        request = urllib.request.Request(URL, headers={'User-Agent': 'TryMyFuture-directory-import/0.1'})
        with urllib.request.urlopen(request, timeout=60) as response:
            content = response.read(15_000_001)
        if len(content) > 15_000_000:
            raise ValueError('Unexpectedly large source archive')
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            archive.getinfo('hd2025.csv')
        raw.write_bytes(content)
    content = raw.read_bytes()
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        text = archive.read('hd2025.csv').decode('utf-8-sig')
    source = list(csv.DictReader(io.StringIO(text)))
    records = []
    for row in source:
        # Exclude closed, merged, administrative, and out-of-scope entries.
        if row['STABBR'] not in STATES or row['ACT'] not in ('A', 'N', 'R') or row['CYACTIVE'] != '1' or row['POSTSEC'] != '1' or row['OPENPUBL'] != '1':
            continue
        unitid = row['UNITID']
        records.append(dict(id=CURATED.get(unitid, 'ipeds-' + unitid), unitid=unitid,
            name=row['INSTNM'].strip(), aliases=row['IALIAS'].strip(), city=row['CITY'].strip(),
            state=row['STABBR'], address=row['ADDR'].strip(), zip=row['ZIP'],
            website=safe_url(row['WEBADDR']), admissions=safe_url(row['ADMINURL']),
            accessibility=safe_url(row['DISAURL']), level=int(row['ICLEVEL']), control=int(row['CONTROL']),
            latitude=coordinate(row['LATITUDE'], 90), longitude=coordinate(row['LONGITUD'], 180),
            coverage='curated' if unitid in CURATED else 'self-guided'))
    records.sort(key=lambda r: (r['name'].casefold(), r['unitid']))
    if len(records) < 4000 or len({r['unitid'] for r in records}) != len(records):
        raise ValueError('Directory is incomplete or contains duplicate UNITIDs; keeping existing output')
    if not set(CURATED).issubset({r['unitid'] for r in records}):
        raise ValueError('Missing curated campus mapping')
    metadata = dict(source='NCES IPEDS HD2025', sourceUrl=URL, sourceYear=2025,
        retrievedAt=datetime.fromtimestamp(raw.stat().st_mtime, timezone.utc).isoformat(), sha256=hashlib.sha256(content).hexdigest(),
        sourceRows=len(source), count=len(records), jurisdictions=len({r['state'] for r in records}),
        filters='ACT in A,N,R; CYACTIVE=1; POSTSEC=1; OPENPUBL=1; 50 states, DC and US territories',
        limitation='Institution records, not every physical campus. Nonreporting schools and some branch locations may be absent. No live opening/access or tour verification.')
    database = ROOT / 'data/campuses.sqlite'
    temporary = database.with_suffix('.sqlite.tmp')
    if temporary.exists():
        temporary.unlink()
    with sqlite3.connect(temporary) as db:
        db.executescript('CREATE TABLE campuses (id TEXT PRIMARY KEY, unitid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, aliases TEXT, city TEXT, state TEXT, address TEXT, zip TEXT, website TEXT, admissions TEXT, accessibility TEXT, level INTEGER, control INTEGER, latitude REAL, longitude REAL, coverage TEXT NOT NULL); CREATE INDEX campuses_state_name ON campuses(state,name); CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);')
        db.executemany('INSERT INTO campuses VALUES (' + ','.join('?' for _ in records[0]) + ')', [tuple(r.values()) for r in records])
        db.executemany('INSERT INTO metadata VALUES (?,?)', [(k, json.dumps(v)) for k,v in metadata.items()])
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('SQLite integrity check failed')
    db.close()
    temporary.replace(database)
    export = '// Generated by scripts/import-directory.py. Do not edit.\nexport const directoryMeta = ' + json.dumps(metadata, ensure_ascii=False) + ';\nexport const directory = ' + json.dumps(records, ensure_ascii=False, separators=(',', ':')) + ';\n'
    output = ROOT / 'web/directory-data.js'
    output.with_suffix('.tmp').write_text(export, encoding='utf-8')
    output.with_suffix('.tmp').replace(output)
    (ROOT / 'data/provenance.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(metadata, indent=2))

if __name__ == '__main__':
    main()
