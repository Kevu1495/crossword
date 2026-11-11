// Upload project files using only short-lived, operation-scoped upload grants.
// Read grants from hidden stdin, never command arguments or files.
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
if (!process.stdin.isTTY) throw new Error('Run with a TTY so upload grants are not echoed.');
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
console.log('Ready for hidden upload JSON');
const input = await new Promise(resolve => {
  let value='';
  process.stdin.on('data',chunk=>{value+=chunk;if(value.includes('\n')){process.stdin.pause();resolve(value.slice(0,value.indexOf('\n')));}});
});
process.stdin.setRawMode(false);
const data=JSON.parse(input);
if(data.kind==='d1') {
  const response=await fetch(data.url,{method:'PUT',body:readFileSync('/tmp/crossword-initial-import.sql')});
  if(!response.ok)throw new Error(`SQL upload failed: ${response.status}`);
  console.log(JSON.stringify({uploaded:true,etag:response.headers.get('etag')}));
} else if(data.kind==='assets') {
  const root='.cloudflare/output/v0/workers/default/assets';
  const manifest=JSON.parse(readFileSync('/tmp/crossword-asset-manifest.json','utf8'));
  const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'};
  let completionJwt=data.buckets.length===0?data.jwt:undefined;
  for(const bucket of data.buckets) {
    const body=new FormData();
    for(const hash of bucket) {
      const entry=Object.entries(manifest).find(([,v])=>v.hash===hash);
      if(!entry)throw new Error('Unknown upload hash');
      const file=join(root,entry[0]);
      body.append(hash,new Blob([readFileSync(file).toString('base64')],{type:types[extname(file)]||'application/octet-stream'}),hash);
    }
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${data.account}/workers/assets/upload?base64=true`,{method:'POST',headers:{Authorization:`Bearer ${data.jwt}`},body});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(`Asset upload failed: ${response.status} ${JSON.stringify(result.errors)}`);
    if(result.result?.jwt)completionJwt=result.result.jwt;
  }
  if(!completionJwt)throw new Error('Missing completion token');
  console.log(JSON.stringify({completionJwt}));
} else throw new Error('Unknown upload kind');
