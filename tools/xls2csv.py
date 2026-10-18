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
    G = cells(xlrd.open_workbook(src).sheet_by_index(0))
    at = lambda r, c: G[r][c] if r < len(G) and c < len(G[r]) else ''
    out = []
    # tables are found by heading ("NYR Player Stats", "BOS Goalie Stats", "Scoring Summary") wherever they sit
    for r, row in enumerate(G):
        for c, cell in enumerate(row):
            parts = cell.split(' ')
            if len(parts) == 3 and parts[1] in ('Player', 'Goalie') and parts[2] == 'Stats':
                team, kind = parts[0], parts[1]
                k = r + 2
                while k < len(G) and at(k, c) and not at(k, c).endswith(' Stats') and at(k, c) != 'Name':
                    if kind == 'Player':   # Name JNo Pos G A Pts SOG ChksF PIM TOI
                        out.append(['P', team, at(k, c), at(k, c + 2), num(at(k, c + 3)), num(at(k, c + 4)), num(at(k, c + 6)), num(at(k, c + 8)), '', '', '', '', at(k, c + 9), num(at(k, c + 7))])
                    else:                  # Name JNo Pos GA SV SHA GAA SV% A TOI
                        out.append(['P', team, at(k, c), 'G', '', num(at(k, c + 8)), '', '', num(at(k, c + 5)), num(at(k, c + 3)), '', '', at(k, c + 9), ''])
                    k += 1
            if cell == 'Scoring Summary':   # Period Time Team G A1 A2 Type
                k = r + 2
                while k < len(G) and at(k, c):
                    out.append(['GOAL', at(k, c + 2), at(k, c + 3), '', '', '', '', '', '', '', at(k, c + 6), at(k, c)])
                    k += 1
    with open(dst, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['ROW', 'TEAM', 'NAME', 'POS', 'G', 'A', 'SOG', 'PIM', 'SHA', 'GA', 'TYPE', 'PERIOD', 'TOI', 'CHK'])
        w.writerows(out)
    return len(out)


if __name__ == '__main__':
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src.rsplit('.', 1)[0] + '.csv'
    print(f'{convert(src, dst)} rows -> {dst}')
