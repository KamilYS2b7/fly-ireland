import {smoothGrid} from './dayOverview.ts';
// Decorative symbols sampled only inside >=25% model cloud-cover areas.
// Density illustrates coverage; symbols do not represent cloud type or geometry.
export function cloudSymbols(grid:(number|undefined)[][]){
 const symbols:{x:number;y:number;coverage:number;scale:number}[]=[];
 for(let row=0;row<16;row++)for(let col=0;col<28;col++){
  const x=(col+.5+(row%2?.18:-.18))/28,y=(row+.5)/16;
  const coverage=smoothGrid(grid,x*(grid.length-1),(1-y)*(grid[0]?.length??0)-.5);
  if(coverage===undefined||coverage<25)continue;
  const rank=((col*73+row*151+col*row*19)%997)/997;
  if(rank>(coverage/100)*.72)continue;
  symbols.push({x,y,coverage,scale:.68+.22*coverage/100});
 }
 return symbols;
}
