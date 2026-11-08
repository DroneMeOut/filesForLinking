/* Loopline City v3. Deterministic, constructive mixed-grid generator.
   No AI, networking, external libraries, or time-based randomness. */
(function(root,factory){const E=factory();if(typeof module==='object')module.exports=E;root.CityEngine=E;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const COLORS=['#f32c55','#1587f6','#69d500','#ffcb20','#ac31e9','#f04fba','#16c8e9'];
const NAMES=['Red','Blue','Green','Yellow','Purple','Pink','Cyan'];
function rng(seed){let h=1779033703;for(const c of seed){h=Math.imul(h^c.charCodeAt(0),3432918353);h=h<<13|h>>>19;}return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function number(s){s=String(s).trim();if(!/^\d{1,200}$/.test(s))throw Error('Use a whole level number (up to 200 digits).');return(BigInt(s)<35n?35n:BigInt(s)).toString();}
function bump(s,d){return number((BigInt(s)+BigInt(d)).toString());}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function ray(v,d){if(d===0)return{x:v.x+v.w,y:v.y,w:22-v.x-v.w,h:v.h};if(d===2)return{x:0,y:v.y,w:v.x,h:v.h};if(d===1)return{x:v.x,y:v.y+v.h,w:v.w,h:22-v.y-v.h};return{x:v.x,y:0,w:v.w,h:v.y};}
function direction(v,turn,mode){return mode==='switch'&&v.w>v.h&&!v.garage&&turn%2?v.dir^2:v.dir;}
function canExit(L,active,turn,id){const v=L.vehicles[id];if(!v||!active.has(id))return false;if(v.garage&&L.vehicles.some(a=>a.garage===v.garage&&a.order<v.order&&active.has(a.id)))return false;const r=ray(v,direction(v,turn,L.mode));if(L.garages.some(g=>g.id!==v.garage&&overlap(r,g)))return false;return !L.vehicles.some(a=>a.id!==id&&!a.garage&&active.has(a.id)&&overlap(r,a));}
function drain(L,s){let moved=0;while(s.q<L.queue.length){const c=L.queue[s.q],b=s.bays.find(b=>b.color===c);if(!b)break;b.left--;s.q++;moved++;if(!b.left)s.bays.splice(s.bays.indexOf(b),1);}return moved;}
function initial(L){return{active:new Set(L.vehicles.map(v=>v.id)),turn:0,q:0,bays:[],limit:5};}
function advance(L,s,id){if(s.bays.length>=s.limit||!canExit(L,s.active,s.turn,id))return false;const v=L.vehicles[id];s.active.delete(id);s.turn++;s.bays.push({id,color:v.color,left:v.cap});drain(L,s);return true;}
function clone(s){return{...s,active:new Set(s.active),bays:s.bays.map(b=>({...b}))};}
function verify(L){const parked=L.vehicles.filter(v=>!v.garage);for(let i=0;i<parked.length;i++){const v=parked[i];if(v.x<0||v.y<0||v.x+v.w>L.cols||v.y+v.h>L.rows)throw Error('Out of bounds');if(L.garages.some(g=>overlap(v,g))||parked.slice(i+1).some(b=>overlap(v,b)))throw Error('Overlapping vehicles');}if(new Set(L.route).size!==L.vehicles.length||L.route.length!==L.vehicles.length)throw Error('Invalid route');const s=initial(L);let peak=0;for(const id of L.route){peak=Math.max(peak,s.bays.length+1);if(!advance(L,s,id))throw Error('Illegal route step '+id);}if(s.active.size||s.bays.length||s.q!==L.queue.length)throw Error('Boarding mismatch');return{ok:true,vehicles:L.vehicles.length,passengers:s.q,peakBays:peak};}
function generate(value,mode='city'){
const level=number(value),R=rng('loopline-city-3:'+level+':'+mode),pick=a=>a[Math.floor(R()*a.length)],int=n=>Math.floor(R()*n);
const garages=[{id:'A',x:7,y:9,w:2,h:2},{id:'B',x:11,y:9,w:2,h:2}];
const cols=20,rows=20,target=BigInt(level)<60n?72:BigInt(level)<150n?80:86;
let vehicles=[],route=[],accepted=false;
// Fill the entire grid, then construct and verify a legal peel sequence.
// Failed candidates are discarded; an unproved board is never returned.
for(let attempt=0;attempt<64&&!accepted;attempt++){
 vehicles=[];route=[];const symmetric=attempt===0;
 for(let tries=0;tries<10000&&vehicles.length<target;tries++){
  const horizontal=R()<.49,len=pick([2,2,3,3,4]),w=horizontal?len:1,h=horizontal?1:len;
  const v={id:vehicles.length,x:int((symmetric?10:cols)-w+1),y:int(rows-h+1),w,h,cap:len===2?4:len===3?8:12,color:int(COLORS.length),mystery:false};
  const group=symmetric?[v,{...v,id:v.id+1,x:cols-v.x-v.w,color:int(COLORS.length)}]:[v];
  if(group.some(b=>garages.some(g=>overlap(b,g))||vehicles.some(a=>overlap(b,a))))continue;
  vehicles.push(...group);
 }
 const remaining=vehicles.slice();
 while(remaining.length){
  const choices=[];
  for(const v of remaining)for(const dir of v.w>v.h?[0,2]:[1,3]){
   const r=ray(v,dir);
   if(!garages.some(g=>overlap(r,g))&&!remaining.some(a=>a.id!==v.id&&overlap(r,a)))choices.push({v,dir});
  }
  if(!choices.length)break;
  const {v,dir}=pick(choices);v.dir=mode==='switch'&&v.w>v.h&&route.length%2?dir^2:dir;
  route.push(v.id);remaining.splice(remaining.indexOf(v),1);
 }
 accepted=remaining.length===0;
}
if(!accepted){
 // Guaranteed constructive fallback, rather than publishing an unsolved board.
 vehicles=[];for(let tries=0;tries<16000&&vehicles.length<target;tries++){
  const horizontal=R()<.49,len=pick([2,2,3,3,4]),w=horizontal?len:1,h=horizontal?1:len;
  const v={id:vehicles.length,x:int(cols-w+1),y:int(rows-h+1),w,h,cap:len===2?4:len===3?8:12,color:int(COLORS.length),mystery:false};
  if(garages.some(g=>overlap(v,g))||vehicles.some(a=>overlap(v,a)))continue;
  const dirs=(horizontal?[0,2]:[1,3]).filter(d=>!garages.some(g=>overlap(ray(v,d),g))&&!vehicles.some(a=>overlap(ray(v,d),a)));
  if(!dirs.length)continue;v.dir=pick(dirs);vehicles.push(v);
 }
 route=vehicles.map(v=>v.id).reverse();for(let t=0;t<route.length;t++){const v=vehicles[route[t]];if(mode==='switch'&&v.w>v.h&&t%2)v.dir^=2;}
}
for(const v of vehicles)v.mystery=BigInt(level)>=60n&&v.x>3&&v.x<16&&v.y>3&&v.y<17&&R()<.32;
for(const g of garages){const count=BigInt(level)<60n?2:3;for(let n=0;n<count;n++){const v={id:vehicles.length,x:g.x,y:g.y,w:1,h:2,dir:3,cap:4,color:int(COLORS.length),garage:g.id,order:n,mystery:false};vehicles.push(v);route.push(v.id);}}
const queue=[];
for(let i=0;i<route.length;){const size=1+int(3),group=route.slice(i,i+size);i+=group.length;for(let j=group.length-1;j>0;j--){const k=int(j+1);[group[j],group[k]]=[group[k],group[j]];}for(const id of group)for(let c=0;c<vehicles[id].cap;c++)queue.push(vehicles[id].color);}
const L={version:3,level,mode,cols,rows,vehicles,garages,route,queue};L.proof=verify(L);return L;
}
function solve(L,input,budget=18000){let s=clone(input);drain(L,s);const memo=new Set(),rank=new Map(L.route.map((id,i)=>[id,i]));let nodes=0,exhausted=false;
function search(s){if(!s.active.size)return s.q===L.queue.length&&s.bays.length===0?[]:null;if(++nodes>budget){exhausted=true;return null;}if(s.bays.length>=s.limit)return null;
 const key=[Array.from(s.active).sort((a,b)=>a-b).join('.'),s.turn%2,s.q,s.bays.map(b=>b.id+':'+b.left).join('.')].join('/');if(memo.has(key))return null;
 const options=Array.from(s.active).filter(id=>canExit(L,s.active,s.turn,id)).sort((a,b)=>rank.get(a)-rank.get(b));
 for(const id of options){const ns=clone(s);advance(L,ns,id);const tail=search(ns);if(tail)return[id,...tail];if(exhausted)break;}memo.add(key);return null;
}
const path=search(s);return{path,nodes,exhausted};}
return{COLORS,NAMES,number,bump,overlap,ray,direction,canExit,drain,initial,advance,clone,verify,generate,solve};
});
