// This prefix is reserved for the isolated API on the existing HTTPS host.
const ORIGIN = 'https://api-test.adbooster.co.kr/bulllab-origin';
const safe = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function origin(path, request) {
  const headers=new Headers();
  for(const name of ['authorization','idempotency-key','content-type','if-match']) {const value=request.headers.get(name);if(value)headers.set(name,value);}
  return fetch(ORIGIN+path,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'});
}
async function list(request) {
 const r=await origin('/public/list',new Request(request.url));if(!r.ok)throw new Error('origin unavailable');const rows=await r.json();if(!Array.isArray(rows))throw new Error('invalid origin response');return rows.filter(x=>/^[a-f0-9-]{36}$/.test(x.id)&&typeof x.title==='string'&&typeof x.created_at==='string');
}
export async function onRequest(context) {
 const {request}=context; const url=new URL(request.url); const p=url.pathname;
 if(p.startsWith('/api/collector/') || p.startsWith('/api/admin/')) { try{return await origin(p,request);}catch{return Response.json({error:'storage_unavailable',retryable:true},{status:503,headers:{'cache-control':'no-store'}});} }
 if(/^\/apps\/posts\/[a-f0-9-]{36}$/.test(p)) {try{return await origin('/public/posts/'+p.split('/').pop(),request);}catch{return new Response('게시글을 불러올 수 없습니다.',{status:503,headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8'}});} }
 if(request.method!=='GET'||!['/pages/apps','/pages/apps.html','/sitemap.xml'].includes(p))return context.next();
 const original=await context.next(); if(!original.ok)return original;
 try {
  const rows=await list(request);const content=await original.clone().text();const headers=new Headers(original.headers);headers.delete('content-length');headers.delete('etag');headers.set('cache-control','no-store');
  if(p==='/sitemap.xml') {const urls=rows.map(x=>`  <url><loc>https://bulllab.kr/apps/posts/${safe(x.id)}</loc><lastmod>${safe((typeof x.updated_at==='string'?x.updated_at:x.created_at).slice(0,10))}</lastmod></url>`).join('\n');return new Response(content.replace('</urlset>',`${urls}\n</urlset>`),{status:original.status,headers});}
  const links=rows.map(x=>`<li><a class="pl-title" href="/apps/posts/${safe(x.id)}">${safe(x.title)}</a><span class="pl-meta">${safe(x.created_at.slice(0,10))}</span></li>`).join('');
  return new Response(content.replace('</ul>',`${links}</ul>`),{status:original.status,headers});
 }catch {return original;}
}
