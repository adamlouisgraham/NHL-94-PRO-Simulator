"""Convert an NHL 94 Stat Extractor .xls box score to the simulator's game-import CSV.

Usage:  python tools/xls2csv.py path/to/game.xls [out.csv]
Needs:  python -m pip install xlrd

CSV columns: ROW,TEAM,NAME,POS,G,A,SOG,PIM,SHA,GA,TYPE
  ROW=P     one line per player (skaters: G/A/SOG/PIM, goalies: SHA/GA)
  ROW=GOAL  one line per goal from the scoring summary (TYPE = PP / SH / EV ...)
"""
import csv, sys, xlrd


def cells(sh):
    return [[str(c).strip() for c in sh.row_values(r)] for r in range(sh.nrows)]


def num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def convert(src, dst):
    rows = cells(xlrd.open_workbook(src).sheet_by_index(0))
    out = []
    team, mode = None, None
    for r in rows:
        right = r[9:19] if len(r) >= 19 else []
        if right and right[0].endswith('Player Stats'):
            team, mode = right[0].split()[0], 'skater'; continue
        if right and right[0].endswith('Goalie Stats'):
            team, mode = right[0].split()[0], 'goalie'; continue
        if right and right[0] == 'Name':
            continue
        if right and right[0] and mode and team:
            name, pos = right[0], right[2]
            if mode == 'skater':   # Name JNo Pos G A Pts SOG ChksF PIM TOI
                out.append(['P', team, name, pos, num(right[3]), num(right[4]), num(right[6]), num(right[8]), '', '', ''])
            else:                  # Name JNo Pos GA SV SHA GAA SV% A TOI
                out.append(['P', team, name, 'G', '', num(right[8]), '', '', num(right[5]), num(right[3]), ''])
    # scoring summary: Period Time Team G A1 A2 Type (columns 1..7)
    in_goals = False
    for r in rows:
        if len(r) > 1 and r[1] == 'Scoring Summary':
            in_goals = True; continue
        if len(r) > 1 and r[1] == 'Penalty Summary':
            break
        if in_goals and len(r) > 7 and r[1] and r[1] != 'Period' and r[4]:
            out.append(['GOAL', r[3], r[4], '', '', '', '', '', '', '', r[7]])
    with open(dst, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['ROW', 'TEAM', 'NAME', 'POS', 'G', 'A', 'SOG', 'PIM', 'SHA', 'GA', 'TYPE'])
        w.writerows(out)
    return len(out)


if __name__ == '__main__':
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src.rsplit('.', 1)[0] + '.csv'
    print(f'{convert(src, dst)} rows -> {dst}')
