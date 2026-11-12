"""Seeded, bounded crossword constraint solver and independent structural checks."""
from collections import defaultdict
from dataclasses import dataclass
import random
import time


@dataclass(frozen=True)
class Slot:
    number: int
    direction: str
    cells: tuple


def slots_for(layout):
    n = len(layout)
    if n not in (7, 11, 15) or any(len(row) != n for row in layout):
        raise ValueError('Grid must be square: 7, 11 or 15')
    if any(ch not in '.#ABCDEFGHIJKLMNOPQRSTUVWXYZ' for row in layout for ch in row):
        raise ValueError('Invalid cell')
    slots, number = [], 0
    for r in range(n):
        for c in range(n):
            if layout[r][c] == '#':
                continue
            starts = []
            for direction, dr, dc in [('across', 0, 1), ('down', 1, 0)]:
                if (r - dr < 0 or c - dc < 0 or layout[r-dr][c-dc] == '#'):
                    cells, rr, cc = [], r, c
                    while rr < n and cc < n and layout[rr][cc] != '#':
                        cells.append((rr, cc))
                        rr, cc = rr + dr, cc + dc
                    if len(cells) < 3:
                        raise ValueError('Every answer must have at least three letters')
                    starts.append((direction, tuple(cells)))
            if starts:
                number += 1
                slots.extend(Slot(number, d, cells) for d, cells in starts)
    open_cells = {(r, c) for r in range(n) for c in range(n) if layout[r][c] != '#'}
    if not open_cells:
        raise ValueError('Empty grid')
    visited, pending = set(), [min(open_cells)]
    while pending:
        cell = pending.pop()
        if cell in visited:
            continue
        visited.add(cell)
        r, c = cell
        pending.extend(p for p in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)] if p in open_cells and p not in visited)
    if visited != open_cells:
        raise ValueError('Grid is disconnected')
    counts = defaultdict(int)
    for slot in slots:
        for cell in slot.cells:
            counts[cell] += 1
    if any(counts[c] != 2 for c in open_cells):
        raise ValueError('Every letter must be checked in both directions')
    return slots


def template(size, seed):
    rng = random.Random(seed)
    board = [['.'] * size for _ in range(size)]
    # Preserve 180-degree symmetry; reject additions that break any grid rule.
    candidates = [(r,c) for r in range(size) for c in range(size) if (r,c) <= (size-1-r,size-1-c)]
    rng.shuffle(candidates)
    target = round(size * size * .23)
    for r, c in candidates:
        other = (size-1-r, size-1-c)
        previous = [row[:] for row in board]
        board[r][c] = board[other[0]][other[1]] = '#'
        try:
            slots_for(board)
        except ValueError:
            board = previous
        if sum(row.count('#') for row in board) >= target:
            break
    return [''.join(row) for row in board]


class NoFill(Exception):
    pass


def solve(layout, records, seed=0, max_seconds=10, max_nodes=100000, excluded_answers=None):
    slots = slots_for(layout)
    rng = random.Random(seed)
    by_word = defaultdict(list)
    for record in records:
        by_word[record['answer']].append(record)
    excluded_answers = set(excluded_answers or ())
    words = sorted(set(by_word) - excluded_answers)
    domains_by_length, index = defaultdict(set), defaultdict(set)
    for word in words:
        domains_by_length[len(word)].add(word)
        for pos, letter in enumerate(word):
            index[len(word), pos, letter].add(word)
    domains = [domains_by_length[len(s.cells)].copy() for s in slots]
    membership = defaultdict(list)
    for i, slot in enumerate(slots):
        for p, cell in enumerate(slot.cells):
            membership[cell].append((i,p))
    cross = defaultdict(list)
    for owners in membership.values():
        (i,p),(j,q) = owners
        cross[i].append((p,j,q))
        cross[j].append((q,i,p))
    started, nodes = time.monotonic(), 0

    def search(current, assignments, used):
        nonlocal nodes
        nodes += 1
        if nodes > max_nodes or time.monotonic() - started > max_seconds:
            raise NoFill('Search budget exhausted')
        if len(assignments) == len(slots):
            return assignments
        choices = [(len(current[i] - used), -len(cross[i]), i) for i in range(len(slots)) if i not in assignments]
        length, _, i = min(choices)
        if not length:
            return None
        options = sorted(current[i] - used)
        rng.shuffle(options)
        for word in options:
            nxt = current.copy()
            valid = True
            for p, j, q in cross[i]:
                if j in assignments:
                    if assignments[j][q] != word[p]:
                        valid = False
                        break
                else:
                    nxt[j] = current[j] & index[len(slots[j].cells), q, word[p]]
                    if not nxt[j] - used - {word}:
                        valid = False
                        break
            if valid:
                result = search(nxt, assignments | {i: word}, used | {word})
                if result is not None:
                    return result
        return None

    assigned = search(domains, {}, set())
    if assigned is None:
        raise NoFill('Template cannot be filled from this vocabulary')
    board = [list(row) for row in layout]
    entries = []
    for i, slot in enumerate(slots):
        word = assigned[i]
        for (r,c), ch in zip(slot.cells, word):
            board[r][c] = ch
        record = rng.choice(by_word[word])
        entries.append({'number': slot.number, 'direction': slot.direction, 'row': slot.cells[0][0], 'col': slot.cells[0][1], 'answer': word, 'clue': record['clue'], 'clueId': record['id'], 'source': record['source'], 'license': record['license']})
    puzzle = {'size': len(layout), 'seed': seed, 'solution': [''.join(row) for row in board], 'entries': entries}
    validate(puzzle)
    return puzzle


def validate(puzzle):
    slots = slots_for(puzzle['solution'])
    entries = puzzle['entries']
    if len(slots) != len(entries):
        raise ValueError('Missing or extra clue')
    expected = {(s.number,s.direction): s for s in slots}
    seen, answers = set(), set()
    for entry in entries:
        key = entry['number'], entry['direction']
        if key in seen or key not in expected:
            raise ValueError('Duplicate or invalid clue number')
        seen.add(key)
        slot = expected[key]
        answer = ''.join(puzzle['solution'][r][c] for r,c in slot.cells)
        if '.' in answer or answer != entry['answer'] or answer in answers:
            raise ValueError('Invalid answer or repeated answer')
        if (entry['row'], entry['col']) != slot.cells[0] or not entry['clue'].strip():
            raise ValueError('Invalid clue metadata')
        answers.add(answer)
    if puzzle['size'] != len(puzzle['solution']):
        raise ValueError('Invalid size metadata')
