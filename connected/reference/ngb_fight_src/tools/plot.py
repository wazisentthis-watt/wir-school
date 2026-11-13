import json, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, sys
D=json.load(open('/tmp/claude-0/joints.json'))
def metrics(J):
    out=[]
    for f in J:
        L=np.array(f['LeftUpLeg']);R=np.array(f['RightUpLeg']);up=np.array([0,1,0])
        fw=np.cross(L-R,up);fw/=np.linalg.norm(fw)+1e-9; side=np.cross(up,fw)
        s2=np.array(f['Spine2']);hp=np.array(f['Hips'])
        row=[]
        for h in ['LeftHand','RightHand']:
            v=np.array(f[h])-s2; row+= [v@fw, v[1]+s2[1], v@side]
        row+=[hp[0],hp[1],hp[2], np.degrees(np.arctan2(fw[0],fw[2]))]
        out.append(row)
    return np.array(out)
names=list(D.keys())
fig,axs=plt.subplots(len(names),1,figsize=(16,3*len(names)))
for ax,n in zip(axs,names):
    M=metrics(D[n]); t=np.arange(len(M))/30
    ax.plot(t,M[:,0],'b-',label='L fwd');ax.plot(t,M[:,3],'r-',label='R fwd')
    ax.plot(t,M[:,1]-100,'b:',label='L h-100');ax.plot(t,M[:,4]-100,'r:',label='R h-100')
    ax.plot(t,M[:,2],'b--',lw=.6);ax.plot(t,M[:,5],'r--',lw=.6)
    ax2=ax.twinx();ax2.plot(t,M[:,9],'g-',lw=.5);ax2.set_ylabel('yaw')
    ax.set_title(n);ax.grid(alpha=.3);ax.set_xticks(np.arange(0,t[-1]+.01,0.5 if t[-1]<8 else 2))
axs[0].legend(ncol=6)
plt.tight_layout();plt.savefig('/tmp/claude-0/plots/timeline.png',dpi=55)
