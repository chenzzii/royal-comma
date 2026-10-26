"""Completely original playful 'exhausted bureaucracy' theme.
The supplied audio is a STYLE REFERENCE only; no tune, MIDI, or samples are copied.
4/4, offbeat plucks, tuba-like bass, fluty woodwinds, dry comic taps.
"""
from pathlib import Path
import numpy as np, wave, subprocess

SR=22050
BPM=116
BEAT=60/BPM
BARS=32
LENGTH=BARS*4*BEAT
rng=np.random.default_rng(20261026)
N=int((LENGTH+.4)*SR)
L=np.zeros(N,np.float32);R=np.zeros(N,np.float32)
SEMITONES={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
def frequency(n):
    idx=2 if len(n)>=3 and n[1] in '#b' else 1
    return 440*2**((12*(int(n[idx:])+1)+SEMITONES[n[:idx]]-69)/12)
def add(note, t0, beats, gain, voice, pan=0):
    if note is None or note=='-':return
    dur=min(beats*BEAT,LENGTH-t0+.15)
    if dur<=0:return
    start=int(t0*SR); n=min(int(dur*SR),N-start)
    if n<2:return
    t=np.arange(n)/SR; hz=frequency(note)
    if voice=='whistle':
        vibr=.003*np.sin(2*np.pi*4.8*t); ph=2*np.pi*hz*(t+vibr)
        sig=np.sin(ph)+.16*np.sin(2*ph)+.045*np.sin(3*ph)
        env=np.minimum(1,t/.032)*np.minimum(1,(dur-t)/.09)
    elif voice=='pluck':
        ph=2*np.pi*hz*t
        sig=np.sin(ph)+.43*np.sin(2*ph)+.18*np.sin(3*ph)+.08*np.sin(4*ph)
        env=np.minimum(1,t/.004)*np.exp(-4.8*t/max(.17,dur))
    elif voice=='tuba':
        ph=2*np.pi*hz*(t + .002*np.sin(2*np.pi*3*t))
        sig=np.sin(ph)+.27*np.sin(2*ph)+.055*np.sin(3*ph)
        env=np.minimum(1,t/.015)*np.exp(-2.0*t/max(.2,dur))
    elif voice=='marimba':
        ph=2*np.pi*hz*t
        sig=np.sin(ph)+.21*np.sin(3.96*ph)
        env=np.minimum(1,t/.0025)*np.exp(-6*t/max(.15,dur))
    else:raise ValueError(voice)
    env=np.clip(env,0,1).astype(np.float32)
    s=(sig*env*gain).astype(np.float32)
    left=float(np.sqrt((1-pan)/2)); right=float(np.sqrt((1+pan)/2))
    L[start:start+n]+=s*left;R[start:start+n]+=s*right

def hit(t0,kind,amp=.035):
    n=int((.105 if kind=='brush' else .055)*SR)
    start=int(t0*SR)
    if start+n>N:return
    t=np.arange(n)/SR
    noise=rng.uniform(-1,1,n)
    if kind=='brush':
        sig=np.convolve(noise, np.ones(7)/7,mode='same')
        env=np.exp(-40*t)
    else:
        sig=(np.sin(2*np.pi*1250*t)+.35*noise)
        env=np.exp(-95*t)
    L[start:start+n]+=(sig*env*amp*.75).astype(np.float32)
    R[start:start+n]+=(sig*env*amp*.55).astype(np.float32)

# Root, fifth and original accompaniment voicing for each 4-beat bar.
progression=[
 ('G2','D3',['G3','B3','D4']),('G2','D3',['G3','B3','D4']),('C3','G3',['C4','E4','G4']),('D3','A3',['D4','F#4','A4']),
 ('G2','D3',['G3','B3','D4']),('E2','B2',['E3','G3','B3']),('A2','E3',['A3','C4','E4']),('D3','A3',['D4','F#4','A4']),
 ('G2','D3',['G3','B3','D4']),('C3','G3',['C4','E4','G4']),('Eb3','Bb3',['Eb4','G4','Bb4']),('D3','A3',['D4','F#4','A4']),
 ('C3','G3',['C4','E4','G4']),('A2','E3',['A3','C4','E4']),('D3','A3',['D4','F#4','A4']),('G2','D3',['G3','B3','D4']),
 ('E2','B2',['E3','G3','B3']),('B2','F#3',['B3','D#4','F#4']),('C3','G3',['C4','E4','G4']),('D3','A3',['D4','F#4','A4']),
 ('G2','D3',['G3','B3','D4']),('E2','B2',['E3','G3','B3']),('C3','G3',['C4','E4','G4']),('D3','A3',['D4','F#4','A4']),
 ('G2','D3',['G3','B3','D4']),('Eb3','Bb3',['Eb4','G4','Bb4']),('C3','G3',['C4','E4','G4']),('D3','A3',['D4','F#4','A4']),
 ('C3','G3',['C4','E4','G4']),('G2','D3',['G3','B3','D4']),('D3','A3',['D4','F#4','A4']),('G2','D3',['G3','B3','D4'])]
# Completely newly composed whimsical whistle tune, one bar per line.
melody=[
 [('-',4)],[('-',4)],[('E5',1),('D5',1),('-',2)],[('A4',.5),('B4',.5),('D5',1),('-',2)],
 [('B4',.75),('D5',.75),('G5',1),('-',.5),('F#5',1)],
 [('E5',1),('D5',.5),('B4',1),('-',.5),('G4',1)],
 [('C5',.5),('E5',.5),('G5',1.5),('-',.5),('E5',1)],
 [('F#5',.75),('E5',.25),('D5',1),('A4',1),('-',1)],
 [('B4',.5),('D5',.5),('G5',1),('A5',.5),('G5',.5),('D5',1)],
 [('E5',1),('G5',.75),('E5',.25),('C5',1),('-',1)],
 [('Bb4',.5),('Eb5',.5),('G5',1),('F5',.75),('Eb5',1.25)],
 [('D5',1.5),('C5',.5),('A4',.75),('D5',.75),('-',.5)],
 [('E5',1),('D5',.5),('C5',1.5),('-',1)],
 [('A4',.5),('C5',.5),('E5',1),('C5',1),('B4',1)],
 [('A4',.5),('F#5',.5),('E5',.5),('D5',.5),('A4',2)],
 [('G4',1),('B4',1),('D5',1),('-',1)],
 [('B4',.5),('E5',.5),('G5',.5),('B5',.5),('G5',1),('E5',1)],
 [('F#5',.75),('D#5',.75),('B4',.5),('F#5',1),('-',1)],
 [('E5',1),('G5',.5),('E5',.5),('C5',1),('G4',1)],
 [('A4',.75),('D5',.75),('F#5',1),('E5',.5),('D5',1)],
 [('B4',.5),('D5',.5),('G5',1),('A5',.5),('B5',.5),('G5',1)],
 [('G5',1),('E5',.5),('D5',.5),('B4',1),('-',1)],
 [('C5',.5),('E5',.5),('G5',1),('E5',.5),('C5',.5),('G4',1)],
 [('F#5',.5),('E5',.5),('D5',1),('A4',1),('-',1)],
 [('G4',.75),('B4',.75),('D5',.5),('G5',1),('F#5',1)],
 [('Eb5',.5),('G5',.5),('Bb5',1),('G5',1),('Eb5',1)],
 [('E5',.5),('G5',.5),('E5',1),('D5',.5),('C5',1.5)],
 [('A4',.5),('D5',.5),('F#5',1),('E5',1),('D5',1)],
 [('E5',1),('C5',1),('G4',.5),('C5',.5),('-',1)],
 [('B4',1),('D5',.5),('G5',.5),('B4',1),('G4',1)],
 [('A4',.5),('F#5',.5),('E5',1),('D5',1),('A4',1)],
 [('G4',1.5),('D5',.5),('B4',1),('G4',1)],
]
assert len(progression)==len(melody)==BARS
assert all(abs(sum(d for _,d in bar)-4)<1e-6 for bar in melody)
for b,((root,fifth,chord),score) in enumerate(zip(progression,melody)):
    start=b*4*BEAT
    # Contrabass oom, pa, oom, pa; slightly floppy offbeats.
    for beat,note in [(0,root),(2,fifth)]:add(note,start+beat*BEAT,.69,.115,'tuba',pan=-.2)
    for beat in [1,3]:add(root,start+beat*BEAT,.36,.040,'tuba',pan=-.3)
    for beat in [1,3]:
        for j,note in enumerate(chord):add(note,start+(beat+.035*j)*BEAT,.7,.042,'pluck',pan=.4)
    for beat in [.5,2.5]:
        add(chord[1],start+beat*BEAT,.32,.030,'pluck',pan=.28)
    hit(start+1*BEAT,'tap',.040)
    hit(start+3*BEAT,'tap',.046)
    for beat in [1.75,3.75]:hit(start+beat*BEAT,'brush',.019)
    cursor=0.0
    for note,beats in score:
        if note!='-':
            add(note,start+cursor*BEAT,max(.18,beats*.83),.113 if b>=4 else .05,'whistle',pan=.1)
            if b in (11,23,29) and cursor<3:add(note,start+(cursor+.12)*BEAT,.24,.033,'marimba',pan=-.42)
        cursor+=beats
# small room reflections, but dry and intimate overall
for arr in [L,R]:
    dry=arr.copy()
    for delay,volume in [(.081,.10),(.187,.065),(.302,.04)]:
        n=int(delay*SR);arr[n:]+=dry[:-n]*volume
# Control long decay and clicks; final brief fade for loop
L=np.tanh(L*.87);R=np.tanh(R*.87)
fade=int(.04*SR)
L[:fade]*=np.linspace(0,1,fade);R[:fade]*=np.linspace(0,1,fade)
last=int(.19*SR)
L[-last:]*=np.linspace(1,0,last);R[-last:]*=np.linspace(1,0,last)
peak=max(np.max(abs(L)),np.max(abs(R)),.1)
L=L/peak*.81;R=R/peak*.81
stereo=np.stack((L,R),axis=1)
out=Path(__file__).resolve().parents[1]/'audio';out.mkdir(exist_ok=True)
wav=out/'tired_royal_march.wav'
with wave.open(str(wav),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
    f.writeframes((np.clip(stereo,-1,1)*32767).astype('<i2').tobytes())
mp3=out/'tired_royal_march.mp3'
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(mp3)],check=True)
print(f'Created entirely new theme: {LENGTH:.1f} sec, {mp3.stat().st_size/1024:.0f} KiB')
