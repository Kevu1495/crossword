"""Discover distinct checked crossword patterns without counting rotations as new."""
import random
from .core import slots_for, template


def layout_of(puzzle):
    return tuple(''.join('#' if c=='#' else '.' for c in row) for row in puzzle['solution'])


def canonical_key(layout):
    """Treat rotations and mirror images as the same underlying pattern."""
    versions=[]
    board=tuple(layout)
    for _ in range(4):
        versions.extend((board,tuple(row[::-1] for row in board)))
        board=tuple(''.join(row[c] for row in board[::-1]) for c in range(len(board)))
    return min(versions)


def mutate(layout, seed):
    rng=random.Random(seed)
    size=len(layout)
    board=[list(row) for row in layout]
    orbits=[(r,c) for r in range(size) for c in range(size) if (r,c)<=(size-1-r,size-1-c)]
    blocked=[(r,c) for r,c in orbits if board[r][c]=='#']
    # Removing blocks opens crossing choices; adding valid block pairs reshapes them.
    rng.shuffle(blocked)
    for r,c in blocked[:rng.randint(1,3)]:
        board[r][c]=board[size-1-r][size-1-c]='.'
    try: slots_for(board)
    except ValueError: return None
    rng.shuffle(orbits)
    added=0
    for r,c in orbits:
        if board[r][c]=='#': continue
        rr,cc=size-1-r,size-1-c
        board[r][c]=board[rr][cc]='#'
        try: slots_for(board)
        except ValueError:
            board[r][c]=board[rr][cc]='.'
            continue
        added+=1
        if added>=3: break
    result=tuple(''.join(row) for row in board)
    if max(len(s.cells) for s in slots_for(result))>9: return None
    return result


def candidates(size, existing, seed=0, attempts=1200):
    seen={canonical_key(layout) for layout in existing}
    parents=list(existing)
    rng=random.Random(seed)
    for attempt in range(attempts):
        current=seed+attempt
        if parents and attempt%3:
            layout=mutate(rng.choice(parents),current)
        else:
            layout=tuple(template(size,current))
        if layout is None: continue
        if max(len(s.cells) for s in slots_for(layout))>9: continue
        key=canonical_key(layout)
        if key in seen: continue
        seen.add(key)
        yield layout,current
