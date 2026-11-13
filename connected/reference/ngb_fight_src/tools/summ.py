import json,sys
d=json.load(open(sys.argv[1]))
print('t',d['t'],'phase',d['phase'],'result',d['result'],'scores',d['scores'])
for k in ['A','B']: print(k, {x:d[k][x] for x in ['hp','st','kd','thrown','landed','clean','blocked','missed','counters','recipes','recipeFails','reactions']}, d[k]['byStrike'])
print('dist',d['distAvg'],d['distMin'],d['distMax'],'parts',d['parts'],'bs',d['bs'],d['res'])
print('events',d['events'])
