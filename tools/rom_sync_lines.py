"""Sync the ROM's line tables with the sim's current lines.

1. In the sim: SETTINGS > EXPORT ROM LINES  (downloads rom_lines_dayN.json)
2. python tools/rom_sync_lines.py path/to/rom_lines_dayN.json            -> preview only
3. python tools/rom_sync_lines.py path/to/rom_lines_dayN.json --write    -> backup + write

Rows SC1/SC2/CHK/PP1/PP2/PK1/PK2 are rebuilt from the sim. NLC is kept as is, except injured /
suspended players there are swapped for the healthy player in the same spot on the next line down.
Only line-table bytes are written; the script refuses to write if anything else would change.
"""
import json, os, re, shutil, sys

ROM = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ROM', 'nhl94_fight_SIM_ROSTER_30team_v3.1.bin')
TEAMS = ['ANA', 'BOS', 'BUF', 'CGY', 'CHI', 'MIN', 'DET', 'EDM', 'FLA', 'HFD', 'LAK', 'MTL', 'NJD', 'NYI', 'NYR',
         'OTW', 'PHI', 'PIT', 'QUE', 'SJS', 'STL', 'TBL', 'TOR', 'VAN', 'WAS', 'WPG']
ROWS = ['NLC', 'SC1', 'SC2', 'CHK', 'PP1', 'PP2', 'PK1', 'PK2']


def rec_at(d, o):
    if d[o] != 0: return None
    n = d[o + 1]
    if n < 4 or n > 0x1A or n % 2: return None
    s = d[o + 2:o + n].rstrip(b'\0')
    if not s or not re.match(rb"^[A-Za-z][A-Za-z .'-]+$", s): return None
    j = d[o + n]
    if (j >> 4) > 9 or (j & 15) > 9: return None
    return dict(off=o, name=s.decode(), end=o + n + 8)


def team_run(d, k):
    b = int.from_bytes(d[0x30E + 4 * k:0x312 + 4 * k], 'big')
    r = rec_at(d, b + int.from_bytes(d[b:b + 2], 'big')); run = []
    while r: run.append(r); r = rec_at(d, r['end'])
    return b, run


def line_table(d, b):
    return b + int.from_bytes(d[b + 2:b + 4], 'big') + 0x46


def norm(s): return ''.join(c for c in s.lower() if c.isalpha())


def build(d, sim, INJ):
    plan, notes = {}, []
    for k, t in enumerate(TEAMS):
        b, run = team_run(d, k); tb = line_table(d, b)
        assert d[tb] == 1, f'{t}: line table not found'
        slots = {r['name']: i + 1 for i, r in enumerate(run)}; nm = {i + 1: r['name'] for i, r in enumerate(run)}
        def slot(n):
            if n in slots: return slots[n]
            return next((i for rn, i in slots.items() if norm(rn) == norm(n)), None)
        onrom = lambda n: slot(n) is not None
        s = sim[t]
        used = {n for l in s['lines'] for n, p in l} | {n for pr in s['pairs'] for n in pr}
        poolF = [x for x in s['all'] if x['pos'] not in ('D', 'LD', 'RD') and onrom(x['n']) and x['n'] not in INJ]
        poolD = [x for x in s['all'] if x['pos'] in ('D', 'LD', 'RD') and onrom(x['n']) and x['n'] not in INJ]
        for grp, pool in ((s['lines'], poolF), (s['pairs'], poolD)):
            for l in grp:
                for i, x in enumerate(l):
                    n = x[0] if isinstance(x, list) else x
                    if onrom(n): continue
                    rep = next((y for y in sorted(pool, key=lambda y: -y['ovr']) if y['n'] not in used), None)
                    if rep:
                        l[i] = [rep['n'], rep['pos']] if isinstance(x, list) else rep['n']; used.add(rep['n'])
                        notes.append(f'{t}: {n} is not on the ROM roster -> {rep["n"]}')
        F = [f for f in s['F'] if onrom(f['n'])]; D = [x for x in s['D'] if onrom(x['n'])]
        for n, p in [x for l in s['lines'] for x in l]:
            if n not in [f['n'] for f in F]:
                x = next((y for y in poolF if y['n'] == n), None)
                if x: F.append(x)
        pos = {f['n']: f['pos'] for f in F}
        byOvr = sorted(F, key=lambda f: -f['ovr']); byOff = sorted(F, key=lambda f: -f['off']); byDef = sorted(F, key=lambda f: -f['def'])
        dOff = sorted(D, key=lambda x: -x['off']); dDef = sorted(D, key=lambda x: -x['def'])
        def place3(names):
            want = {'LW': None, 'C': None, 'RW': None}; rest = []
            for n in names:
                if pos.get(n) in want and want[pos.get(n)] is None: want[pos.get(n)] = n
                else: rest.append(n)
            for key in ('C', 'LW', 'RW'):
                if want[key] is None and rest: want[key] = rest.pop(0)
            return [want['LW'], want['C'], want['RW']]
        def ea(excl, order=byOvr): return next((f['n'] for f in order if f['n'] not in excl), None)
        fourth = [f['n'] for f in s['F'][9:12] if onrom(f['n'])]   # 4th-line forwards fill the extra-attacker slots
        fx = lambda i, fb: fourth[i % len(fourth)] if fourth else fb
        new = {}
        for i, r in enumerate(['SC1', 'SC2', 'CHK']):
            lw, c, rw = place3([n for n, p in s['lines'][i]]); ld, rd = s['pairs'][i]
            new[r] = [ld, rd, lw, c, rw, fx(i, ea({lw, c, rw}))]
        pp1f = [f['n'] for f in byOvr[:4]]; pp1d = dOff[0]['n']
        pp2f = [f['n'] for f in byOff if f['n'] not in pp1f][:4]; pp2d = next(x['n'] for x in dOff if x['n'] != pp1d)
        for r, fw, dm in (('PP1', pp1f, pp1d), ('PP2', pp2f, pp2d)):
            lw, c, rw = place3(fw[:3]); new[r] = [dm, fw[3], lw, c, rw, ea(set(fw)) if r == 'PP1' else fx(0, ea(set(fw)))]
        df = [f['n'] for f in byDef]; dd = [x['n'] for x in dDef]
        def pk(two, rw):
            a, b2 = two; c, lw = (a, b2) if pos.get(a) == 'C' or pos.get(b2) != 'C' else (b2, a)
            return [lw, c, rw]
        if t == 'PIT': l1 = pk(df[0:2], df[3]); l2 = pk([df[2], df[4]], df[5])   # Lemieux on the PK1 wing
        else: l1 = pk(df[0:2], df[4]); l2 = pk([df[2], df[3]], df[5])
        new['PK1'] = [dd[0], dd[1], *l1, df[6] if len(df) > 6 else None]
        new['PK2'] = [dd[2], dd[3], *l2, fx(1, df[6] if len(df) > 6 else None)]
        rows = {r: list(d[tb + 8 * i:tb + 8 * i + 8]) for i, r in enumerate(ROWS)}
        out = {r: v[:] for r, v in rows.items()}
        for r, names in new.items():
            for j, n in enumerate(names):
                sl = slot(n) if n else None
                if sl: out[r][1 + j] = sl
        nlc = out['NLC']                               # NLC: swap injured players only
        for j in range(1, 7):
            x = nlc[j]
            if not (x and nm[x] in INJ): continue
            for r in ROWS[1:6]:
                c = out[r][j]
                if c and c not in nlc and nm[c] not in INJ:
                    notes.append(f'{t}: NLC injured {nm[x]} -> {nm[c]}'); nlc[j] = c; break
        plan[t] = [dict(row=r, off=tb + 8 * i, cur=rows[r], new=out[r], curN=[nm.get(x, '?') for x in rows[r][1:7]],
                        newN=[nm.get(x, '?') for x in out[r][1:7]]) for i, r in enumerate(ROWS) if out[r] != rows[r]]
        for r in ROWS:
            assert all(0 <= x <= len(run) for x in out[r][1:7]), f'{t} {r}: slot out of range'
    return plan, notes


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args: sys.exit(__doc__)
    exp = json.load(open(args[0], encoding='utf-8'))
    d = bytearray(open(ROM, 'rb').read())
    plan, notes = build(d, exp['teams'], set(exp.get('injured', [])))
    last = lambda n: n.split()[-1]
    rows = sum(len(v) for v in plan.values())
    print(f"Sim day {exp.get('day', '?')}: {rows} of {26 * 8} line rows change")
    for t, rs in plan.items():
        if rs: print(f'  {t}: ' + ' | '.join(f"{r['row']}: " + ', '.join(f'{last(a)}->{last(b)}' for a, b in zip(r['curN'], r['newN']) if a != b) for r in rs))
    for n in notes: print('  note:', n)
    if '--write' not in sys.argv:
        print('\nPreview only. Re-run with --write to apply.'); return
    if not rows: print('Nothing to write.'); return
    new = bytearray(d)
    for rs in plan.values():
        for r in rs: new[r['off']:r['off'] + 8] = bytes(r['new'])
    allowed = {r['off'] + i for rs in plan.values() for r in rs for i in range(8)}
    assert all(i in allowed for i in range(len(d)) if d[i] != new[i]), 'refusing: change outside line tables'
    bak = ROM.replace('.bin', f"_BACKUP_BEFORE_LINES_DAY{exp.get('day', 'X')}.bin")
    shutil.copy(ROM, bak); open(ROM, 'wb').write(new)
    print(f'\nWritten. Backup: {os.path.basename(bak)}')


if __name__ == '__main__':
    main()
