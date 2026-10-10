
const $=s=>document.querySelector(s);
const presets={photo:[20,50,100,200],sign:[10,20,30,50]};
const defKB={photo:50,sign:20};
let mode='photo',img=null,out=null,origSize=0,baseName='image';

function chips(){
  const box=$('#chips');box.innerHTML='';
  presets[mode].forEach(v=>{
    const b=document.createElement('button');b.textContent=v+' KB';
    b.setAttribute('aria-pressed',String(+$('#kb').value===v));
    b.onclick=()=>{$('#kb').value=v;chips()};
    box.appendChild(b);
  });
}
function setMode(m){
  mode=m;
  $('#t-photo').setAttribute('aria-selected',String(m==='photo'));
  $('#t-sign').setAttribute('aria-selected',String(m==='sign'));
  $('#h-up').textContent='1. Choose your '+(m==='photo'?'photo':'signature');
  $('#kb').value=defKB[m];chips();
}
$('#t-photo').onclick=()=>setMode((window.PAGE&&PAGE.mode)||'photo');if(window.PAGE&&PAGE.kb){$('#kb').value=PAGE.kb;chips()}
$('#t-sign').onclick=()=>setMode('sign');
$('#kb').oninput=chips;
setMode('photo');

$('#file').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  origSize=f.size;baseName=f.name.replace(/\.[^.]+$/,'')||'image';
  const i=new Image();
  i.onload=()=>{img=i;$('#fname').textContent=f.name+' ('+fmt(f.size)+')';$('#go').disabled=false;$('#res').style.display='none'};
  i.onerror=()=>{img=null;$('#go').disabled=true;$('#fname').textContent='This file could not be read. Try a JPG or PNG.'};
  i.src=URL.createObjectURL(f);
};
const fmt=b=>b>=1048576?(b/1048576).toFixed(2)+' MB':(b/1024).toFixed(1)+' KB';
const blobAt=(c,q)=>new Promise(r=>c.toBlob(r,'image/jpeg',q));

async function fit(tKB,W,H){
  const max=tKB*1024;let w=W||img.naturalWidth,h=H||img.naturalHeight;
  if(!W&&Math.max(w,h)>1600){const s=1600/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}
  let last=null;
  for(let n=0;n<14;n++){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
    const top=await blobAt(c,.95);
    if(top.size<=max)return{blob:top,w,h};
    let lo=.05,hi=.95,best=null;
    for(let i=0;i<7;i++){const m=(lo+hi)/2,b=await blobAt(c,m);if(b.size<=max){best=b;lo=m}else hi=m}
    if(best)return{blob:best,w,h};
    last={blob:await blobAt(c,.05),w,h,over:true};
    if(W&&H)return last;
    w=Math.round(w*.85);h=Math.round(h*.85);
  }
  return last;
}
$('#go').onclick=async()=>{
  const kb=+$('#kb').value;
  if(!img||!kb||kb<2){alert('Enter a size of at least 2 KB.');return}
  let W=Math.round(+$('#w').value)||0,H=Math.round(+$('#h').value)||0;
  if(W&&!H)H=Math.round(W*img.naturalHeight/img.naturalWidth);
  if(H&&!W)W=Math.round(H*img.naturalWidth/img.naturalHeight);
  $('#go').disabled=true;$('#go').textContent='Resizing…';
  try{out=await fit(kb,W,H)}catch(e){out=null}
  $('#go').disabled=false;$('#go').textContent='Resize image';
  if(!out){alert('Could not resize this image. Try another file.');return}
  const size=out.blob.size,okay=size<=kb*1024;
  $('#prev').src=URL.createObjectURL(out.blob);
  $('#stat').innerHTML=fmt(origSize)+' → <span class="'+(okay?'ok':'bad')+'">'+fmt(size)+'</span> · '+out.w+'×'+out.h+' px';
  $('#warn').textContent=okay?'':'Could not reach '+kb+' KB at this pixel size. Try a smaller width and height, or clear them.';
  $('#res').style.display='block';
  $('#res').scrollIntoView({behavior:'smooth',block:'nearest'});
};
$('#dl').onclick=async()=>{
  if(!out)return;
  const name=baseName+'-'+Math.round(out.blob.size/1024)+'kb.jpg';
  const a=document.createElement('a');
  a.href=URL.createObjectURL(out.blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  $('#hint').textContent='If the download did not start, press and hold the image above and choose Save image.';
};
