import json,sys
p,part=sys.argv[1],sys.argv[2]
d=json.load(open(f'es/ops/{p}.plan.json'))
strip=lambda a:{k:v for k,v in a.items() if k!='remove'}
if part=='builder':
    a,b=int(sys.argv[3]),int(sys.argv[4]); print(json.dumps([strip(x) for x in d['builder'][a:b]],ensure_ascii=False,separators=(',',':')))
elif part=='whtml':
    a=int(sys.argv[3]); print(json.dumps([strip(x) for x in d['whtml'][a:a+5]],ensure_ascii=False,separators=(',',':')))
elif part=='remove':
    ids=[r for x in d['builder']+d['whtml'] for r in x['remove']]
    a,b=int(sys.argv[3]),int(sys.argv[4])
    print(json.dumps([{'label':'r%d'%i,'remove_element':{'id':r}} for i,r in enumerate(ids[a:b],a)],separators=(',',':')))
