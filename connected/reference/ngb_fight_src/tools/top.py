import json, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, sys
D=json.load(open('/tmp/claude-0/joints.json'))
name=sys.argv[1];t0=float(sys.argv[2]);t1=float(sys.argv[3])
J=D[name];idx=[i for i in range(len(J)) if t0<=i/30<=t1][::2]
fig,axs=plt.subplots(2,len(idx),figsize=(len(idx)*1.8,4.2))
segs=[('Spine2','LeftShoulder'),('LeftShoulder','LeftArm'),('LeftArm','LeftForeArm'),('LeftForeArm','LeftHand'),('Spine2','RightShoulder'),('RightShoulder','RightArm'),('RightArm','RightForeArm'),('RightForeArm','RightHand'),('Hips','Spine2'),('Spine2','Head'),('LeftUpLeg','LeftFoot'),('RightUpLeg','RightFoot')]
for k,i in enumerate(idx):
    f=J[i]
    for row,(a,b) in enumerate([(0,2),(0,1)]):
        ax=axs[row,k]; c0=np.array(f['Hips'])
        for s1,s2 in segs:
            c='b' if 'Left' in s1+s2 else 'r' if 'Right' in s1+s2 else 'k'
            ax.plot([f[s1][a]-c0[a],f[s2][a]-c0[a]],[f[s1][b]-(c0[b] if b==2 else 0),f[s2][b]-(c0[b] if b==2 else 0)],c,lw=2)
        ax.set_aspect('equal');ax.axis('off')
        if row==0: ax.set_xlim(-70,70);ax.set_ylim(-50,90);ax.set_title(f'{i/30:.2f}',fontsize=8)
        else: ax.set_xlim(-70,70);ax.set_ylim(0,190)
plt.suptitle(name+' top(z up) / front');plt.tight_layout();plt.savefig(f'/tmp/claude-0/plots/top_{name}.png',dpi=50)
