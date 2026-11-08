import {smoothGrid} from './dayOverview.ts';
type Point={x:number;y:number};
// Isolines on the same interpolated coverage field. Missing corners are skipped.
export function cloudContours(grid:(number|undefined)[][],thresholds=[25,50,75,90]){
 const nx=104,ny=80;
 const values=Array.from({length:nx+1},(_,x)=>Array.from({length:ny+1},(_,y)=>smoothGrid(grid,x/nx*(grid.length-1),y/ny*(grid[0]?.length??0)-.5)));
 return thresholds.flatMap(threshold=>{
  const segments:[Point,Point][]=[];
  for(let x=0;x<nx;x++)for(let y=0;y<ny;y++){
   const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([a,b])=>({x:a/nx,y:1-b/ny,value:values[a][b]}));
   if(corners.some(p=>p.value===undefined))continue;
   for(const indices of [[0,1,2],[0,2,3]]){
    const hits:Point[]=[];
    for(let edge=0;edge<3;edge++){
     const a=corners[indices[edge]],b=corners[indices[(edge+1)%3]];
     if((a.value!<threshold)===(b.value!<threshold))continue;
     const f=(threshold-a.value!)/(b.value!-a.value!);hits.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});
    }
    if(hits.length===2&&Math.hypot(hits[0].x-hits[1].x,hits[0].y-hits[1].y)>1e-8)segments.push([hits[0],hits[1]]);
   }
  }
  const key=(p:Point)=>`${p.x.toFixed(5)},${p.y.toFixed(5)}`;
  const links=new Map<string,number[]>();
  segments.forEach((segment,i)=>segment.forEach(p=>{const k=key(p);links.set(k,[...(links.get(k)??[]),i]);}));
  const used=new Set<number>(),paths:Point[][]=[];
  const walk=(seed:number,start:Point)=>{
   const points=[start];let index=seed,current=start;
   while(!used.has(index)){
    used.add(index);const segment=segments[index],next=key(segment[0])===key(current)?segment[1]:segment[0];points.push(next);current=next;
    const candidate=links.get(key(current))?.find(i=>!used.has(i));if(candidate===undefined)break;index=candidate;
   }
   if(points.length>1)paths.push(points);
  };
  segments.forEach((s,i)=>{if(!used.has(i)){const endpoint=s.find(p=>links.get(key(p))?.length===1);if(endpoint)walk(i,endpoint);}});
  segments.forEach((s,i)=>{if(!used.has(i))walk(i,s[0]);});
  return paths.map(points=>({threshold,points}));
 });
}
