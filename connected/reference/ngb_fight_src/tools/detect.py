import json, numpy as np
D=json.load(open('/tmp/claude-0/joints.json'))
def yaw_of(f):
    L=np.array(f['LeftUpLeg']);R=np.array(f['RightUpLeg']);fw=np.cross(L-R,[0,1,0]);return np.arctan2(fw[0],fw[2])
idle=D['Bouncing_Fight_Idle']; off=-np.mean([yaw_of(f) for f in idle]); print('blade offset deg',np.degrees(off))
from scipy.ndimage import uniform_filter1d
for name,J in D.items():
    yaws=np.array([yaw_of(f) for f in J])+off
    yaws=np.unwrap(yaws); yaws=uniform_filter1d(yaws,9)
    out=[]
    for h,sh in [('LeftHand','LeftArm'),('RightHand','RightArm')]:
        P=np.array([f[h] for f in J]); S=np.array([f['Spine2'] for f in J]); A=np.array([f[sh] for f in J]); H=np.array([f['Hips'] for f in J])
        fw=np.stack([np.sin(yaws),0*yaws,np.cos(yaws)],1); side=np.stack([np.cos(yaws),0*yaws,-np.sin(yaws)],1)
        rel=P-S; ext=np.sum(rel*fw,1); lat=np.sum(rel*side,1); hgt=P[:,1]
        V=np.gradient(P,axis=0)*30; sp=np.linalg.norm(V,axis=1)
        vf=np.sum(V*fw,1); vl=np.sum(V*side,1); vu=V[:,1]
        # peaks in speed above 250 cm/s
        i=1
        while i<len(J)-1:
            if sp[i]>250 and sp[i]>=sp[i-1] and sp[i]>=sp[i+1]:
                # integrate motion over +-4 frames
                a=max(0,i-5);b=min(len(J)-1,i+5)
                d=P[b]-P[a]; dfw=d@fw[i]; dl=d@side[i]; du=d[1]
                # find extension peak after i
                j=i
                while j<min(len(J)-1,i+10) and sp[j+1]<sp[j]*1.2 and ext[j+1]>=ext[j]-0.5: j+=1
                out.append((i/30,h[:1],int(sp[i]),int(dfw),int(dl),int(du),int(hgt[i]),int(ext[j]),j/30, int(H[i,1])))
                i+=6
            else: i+=1
    out.sort()
    print('==',name)
    for o in out: print('  t=%.2f %s spd=%d dF=%d dLat=%d dUp=%d h=%d ext=%d peak=%.2f hipsY=%d'%o)
