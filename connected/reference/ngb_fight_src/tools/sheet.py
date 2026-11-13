import json, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, sys
D=json.load(open('/tmp/claude-0/joints.json'))
segs=[('Hips','Spine'),('Spine','Spine1'),('Spine1','Spine2'),('Spine2','Neck'),('Neck','Head'),('Head','HeadTop_End')]
for s in ['Left','Right']:
    segs+=[('Spine2',s+'Shoulder'),(s+'Shoulder',s+'Arm'),(s+'Arm',s+'ForeArm'),(s+'ForeArm',s+'Hand'),('Hips',s+'UpLeg'),(s+'UpLeg',s+'Leg'),(s+'Leg',s+'Foot'),(s+'Foot',s+'ToeBase')]
name=sys.argv[1]; step=int(sys.argv[2]); t0=float(sys.argv[3]) if len(sys.argv)>3 else 0; t1=float(sys.argv[4]) if len(sys.argv)>4 else 1e9; yaw=float(sys.argv[5]) if len(sys.argv)>5 else 60
J=D[name]; idx=[i for i in range(0,len(J),step) if t0<=i/30<=t1]
cols=8; rows=(len(idx)+cols-1)//cols
fig,axs=plt.subplots(rows,cols,figsize=(cols*2,rows*2.6)); axs=np.array(axs).reshape(-1)
a=np.radians(yaw)
def P(p): return (p[0]*np.cos(a)+p[2]*np.sin(a), p[1])
for ax in axs: ax.axis('off')
for k,i in enumerate(idx):
    f=J[i]; ax=axs[k]; hx=f['Hips'][0]*np.cos(a)+f['Hips'][2]*np.sin(a)
    for s1,s2 in segs:
        c='b' if 'Left' in s1+s2 else 'r' if 'Right' in s1+s2 else 'k'
        p1=P(f[s1]);p2=P(f[s2]);ax.plot([p1[0]-hx,p2[0]-hx],[p1[1],p2[1]],c,lw=2)
    for h,c in [('LeftHand','b'),('RightHand','r')]:
        p=P(f[h]);ax.plot(p[0]-hx,p[1],'o',color=c,ms=7)
    ax.plot([-60,60],[0,0],'g',lw=.5); ax.set_xlim(-90,90);ax.set_ylim(-5,190);ax.set_aspect('equal');ax.set_title(f'{i/30:.2f}s',fontsize=8)
plt.suptitle(name+f' yaw{yaw}');plt.tight_layout();plt.savefig(f'/tmp/claude-0/plots/{name}.png',dpi=48)
