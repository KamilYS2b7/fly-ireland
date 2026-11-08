export type HeightUnit='m'|'ft';
export const heightFactor=(unit:HeightUnit)=>unit==='ft'?1/0.3048:1;
export const heightLabel=(metres:number,unit:HeightUnit)=>`${Math.round(metres*heightFactor(unit)).toLocaleString('en-GB')} ${unit}`;
export function altitudeTicks(minM:number,maxM:number,unit:HeightUnit){
 const factor=heightFactor(unit),span=(maxM-minM)*factor;
 const step=unit==='ft'?(span<=2000?250:span<=5000?500:span<=10000?1000:2000):(span<=1500?250:span<=3500?500:1000);
 const first=Math.ceil(minM*factor/step),last=Math.floor(maxM*factor/step);
 return Array.from({length:Math.max(0,last-first+1)},(_,i)=>(first+i)*step/factor);
}
type Point={x:number;y:number};
// Shape-preserving cubic Hermite interpolation: passes through native samples,
// keeps extrema and breaks at missing hours. No averaging forecast heights.
export function smoothHeightPath(points:(Point|undefined)[]){
 const runs:Point[][]=[];let run:Point[]=[];
 for(const point of [...points,undefined]){if(point)run.push(point);else if(run.length){runs.push(run);run=[];}}
 return runs.map(p=>{
  let path=`M${p[0].x},${p[0].y}`;if(p.length===1)return path;
  const delta=p.slice(1).map((b,i)=>(b.y-p[i].y)/(b.x-p[i].x));
  const slopes=p.map((_,i)=>!i?delta[0]:i===p.length-1?delta.at(-1)!:delta[i-1]*delta[i]<=0?0:2/(1/delta[i-1]+1/delta[i]));
  for(let i=0;i<p.length-1;i++){
   const a=p[i],b=p[i+1],dx=(b.x-a.x)/3,low=Math.min(a.y,b.y),high=Math.max(a.y,b.y);
   const clamp=(value:number)=>Math.max(low,Math.min(high,value));
   path+=` C${a.x+dx},${clamp(a.y+slopes[i]*dx)} ${b.x-dx},${clamp(b.y-slopes[i+1]*dx)} ${b.x},${b.y}`;
  }
  return path;
 }).join(' ');
}
