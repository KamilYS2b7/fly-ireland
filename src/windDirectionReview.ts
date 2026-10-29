import type {WindRange} from './windRanges';
type ReviewSite={id:string;name:string;lat:number;lon:number;country?:string;directionUnverified?:boolean};
export type DirectionEntry={draft:string;windRanges?:WindRange[];confirmedAt?:string;updatedAt:string};
export type DirectionReviewState=Record<string,DirectionEntry>;
type ReviewStorage=Pick<Storage,'getItem'|'setItem'>;
export const DIRECTION_REVIEW_STORAGE_KEY='fly-ireland.poland-wind-directions.v1';
const kind='fly-ireland-wind-direction-review';
export function parseDirectionRanges(text:string):WindRange[]{
 const chunks=text.trim().split(/\s*[\/;]\s*/);
 if(chunks.length>4)throw Error('Use up to four direction ranges.');
 return chunks.map(chunk=>{
  const match=chunk.match(/^\s*(\d+(?:\.\d+)?)\s*°?\s*[-–—]\s*(\d+(?:\.\d+)?)\s*°?\s*$/);
  if(!match)throw Error('Enter degrees, for example 80-130 or 285-15. Separate ranges with /.');
  const start=Number(match[1]),end=Number(match[2]);
  if(start<0||start>=360||end<0||end>360||start===end)throw Error('Start must be 0-359 and end 0-360, with different bounds. Use 0-360 for all directions.');
  return {start,end};
 });
}
const validDate=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function createWindDirectionReview(sites:ReviewSite[],storage?:ReviewStorage){
 const countrySites=sites.filter(site=>site.country==='poland').sort((a,b)=>a.name.localeCompare(b.name,'en'));
 const eligible=countrySites.filter(site=>site.directionUnverified);
 // Retain completed history after an owner-reviewed sector enters production.
 // The same cumulative file must still reconnect without discarding drafts.
 const known=new Map(countrySites.map(site=>[site.id,site]));
 function checked(input:any):DirectionReviewState{
  if(input?.kind!==kind||input.version!==1||!Array.isArray(input.sites))throw Error('This is not a Fly Ireland wind-direction review file.');
  const state:DirectionReviewState={};
  for(const row of input.sites){
   const site=known.get(row?.id);
   if(!site||Object.hasOwn(state,site.id)||typeof row.lat!=='number'||typeof row.lon!=='number'||Math.abs(row.lat-site.lat)>0.000001||Math.abs(row.lon-site.lon)>0.000001
    ||!Number.isFinite(row.lat)||!Number.isFinite(row.lon)||typeof row.draft!=='string'||row.draft.length>200||!validDate(row.updatedAt))throw Error('Review file contains an unknown, duplicate or changed location.');
   let ranges:WindRange[]|undefined;
   if(row.confirmedAt!==undefined){
    if(!validDate(row.confirmedAt)||!Array.isArray(row.windRanges)||!row.windRanges.length)throw Error('Invalid confirmed wind range.');
    ranges=parseDirectionRanges(row.windRanges.map((r:any)=>`${r.start}-${r.end}`).join(' / '));
    if(row.windRanges.some((r:any)=>typeof r.start!=='number'||typeof r.end!=='number'))throw Error('Invalid range values.');
   }else if(row.windRanges!==undefined)throw Error('Unconfirmed ranges must remain a draft.');
   state[site.id]={draft:row.draft,updatedAt:row.updatedAt,...(ranges?{windRanges:ranges,confirmedAt:row.confirmedAt}:{})};
  }
  return state;
 }
 function report(state:DirectionReviewState){
  return {kind,version:1,country:'poland',exportedAt:new Date().toISOString(),
   sites:countrySites.filter(site=>state[site.id]).map(site=>({id:site.id,name:site.name,lat:site.lat,lon:site.lon,...state[site.id]}))};
 }
 function merge(state:DirectionReviewState,text:string){
  const loaded=checked(JSON.parse(text)),next={...state};
  for(const [id,entry]of Object.entries(loaded)){
   const previous=next[id];
   if(!previous){next[id]=entry;continue;}
   const draft=Date.parse(entry.updatedAt)>Date.parse(previous.updatedAt)?entry:previous;
   const confirmed=Date.parse(entry.confirmedAt??'')>Date.parse(previous.confirmedAt??'')||(!previous.confirmedAt&&entry.confirmedAt)?entry:previous;
   next[id]={draft:draft.draft,updatedAt:draft.updatedAt,...(confirmed.confirmedAt?{windRanges:confirmed.windRanges,confirmedAt:confirmed.confirmedAt}:{})};
  }
  return next;
 }
 function read(){try{
  const text=(storage??globalThis.localStorage)?.getItem(DIRECTION_REVIEW_STORAGE_KEY);
  return {state:text?checked(JSON.parse(text)):{}};
 }catch{return {state:{},error:'Could not restore browser review data. Load your JSON backup.'};}}
 function save(state:DirectionReviewState){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(DIRECTION_REVIEW_STORAGE_KEY,JSON.stringify(report(state)));return true;}catch{return false;}}
 function draft(state:DirectionReviewState,id:string,text:string){
  if(!known.has(id)||text.length>200)throw Error('Invalid review site or range text.');
  return {...state,[id]:{...state[id],draft:text,updatedAt:new Date().toISOString()}};
 }
 function confirm(state:DirectionReviewState,id:string){
  if(!known.has(id))throw Error('Unknown review site.');
  const windRanges=parseDirectionRanges(state[id]?.draft??''),now=new Date().toISOString();
  return {...state,[id]:{...state[id],windRanges,confirmedAt:now,updatedAt:now}};
 }
 function next(state:DirectionReviewState,currentId?:string){
  const current=eligible.findIndex(site=>site.id===currentId);
  for(let offset=1;offset<=eligible.length;offset++){
   const site=eligible[(current+offset)%eligible.length];
   if(site.id!==currentId&&!state[site.id]?.confirmedAt)return site;
  }
 }
 return {eligible,read,save,draft,confirm,report,merge,next};
}

// The file is read and validated before the first write. A rejected/cancelled
// file never replaces the active handle; failed writes keep browser data intact.
export function createDirectionReviewFile({getReport,onImport}:{getReport:()=>unknown;onImport:(text:string)=>void}){
 let handle:any,queue=Promise.resolve();
 function save(){
  const target=handle;if(!target)return Promise.reject(Error('Choose a review file first.'));
  const operation=queue.catch(()=>{}).then(async()=>{
   const text=JSON.stringify(getReport(),null,2)+'\n';
   const writer=await target.createWritable();
   try{await writer.write(text);await writer.close();}catch(error){try{await writer.abort?.();}catch{}throw error;}
  });
  queue=operation;return operation;
 }
 async function connect(next:any){
  await queue.catch(()=>{});
  const text=await (await next.getFile()).text();
  if(text.trim())onImport(text);
  handle=next;await save();
 }
 return {connect,save,get name(){return handle?.name??'';}};
}
