import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const page = path.join(root,'dist/index.html');
if (!fs.existsSync(page)) throw Error('Run npm run build first');
http.createServer((req,res)=>{
  if (!['/','/index.html'].includes(new URL(req.url,'http://localhost').pathname)) {
    res.writeHead(404);res.end('Not found');return;
  }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  fs.createReadStream(page).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Playing at http://127.0.0.1:${port}/`));
