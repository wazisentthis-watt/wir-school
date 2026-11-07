# Diagnostic-only; run in Blender with original METAL rig open.
# blender -b METAL_Rig.blend --python metal_retarget_preflight.py
import bpy,json
armatures=[o for o in bpy.data.objects if o.type=='ARMATURE']
target=next((a for a in armatures if a.name=='METAL_Rig'),None) or next((a for a in armatures if a.pose.bones.get('LeftLowerLeg')),None)
candidates={'mixamorig:LeftUpLeg':['LeftUpperLeg','DEF-thigh.L'],'mixamorig:LeftLeg':['LeftLowerLeg','DEF-shin.L'],'mixamorig:LeftFoot':['LeftFoot','DEF-foot.L'],'mixamorig:RightUpLeg':['RightUpperLeg','DEF-thigh.R'],'mixamorig:RightLeg':['RightLowerLeg','DEF-shin.R'],'mixamorig:RightFoot':['RightFoot','DEF-foot.R'],'mixamorig:Spine2':['Chest','DEF-spine.003']}
if target is None:print('HOLD: actual METAL armature not found; no constraint or retarget applied')
else:
 names=set(target.pose.bones.keys())
 mapping={src:next((x for x in choices if x in names),None) for src,choices in candidates.items()}
 knee=target.pose.bones.get(mapping['mixamorig:LeftLeg'] or 'LeftLowerLeg')
 print(json.dumps({'armature':target.name,'bones':len(names),'suggested_mapping':mapping,'left_knee_found':bool(knee),'left_knee_rotation_mode':knee.rotation_mode if knee else None,'next':'Inspect rig local axis + correct flexion range; no constraints set'},indent=2))
# User's example LIMIT_ROTATION(Y=Z=0) is not a universal prosthetic hinge and is NOT executed here.
