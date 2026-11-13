for spec in "$@"; do set -- $(echo $spec | tr ':' ' '); timeout 700 node sim.js $1 $2 ${3:-normal} 400 2>/dev/null > /tmp/claude-0/s.json; python3 - <<'PY'
import json; d=json.load(open('/tmp/claude-0/s.json'))
A,B=d['A'],d['B']; acc=lambda s: f"{s['landed']}/{s['thrown']}={s['landed']*100//max(1,s['thrown'])}%"
print(f"{d['t']:6}s {str(d['result']):55} cards {d['scores']} | A hp{A['hp']:5} kd{A['kd']} {acc(A)} cl{A['clean']} blk{A['blocked']} ctr{A['counters']} rc{A['recipes']}/{A['recipeFails']} | B hp{B['hp']:5} kd{B['kd']} {acc(B)} cl{B['clean']} blk{B['blocked']} ctr{B['counters']} rc{B['recipes']}/{B['recipeFails']} | bs {d['bs']}")
PY
done
