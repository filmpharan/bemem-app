// Isolated review controls only. Existing folder render/interaction code is reused.
(()=>{
 const params=new URLSearchParams(location.search),d=window.LAGOON_FOLDER_DATA;
 const intro=document.querySelector('.intro');intro.querySelector('h1').textContent='New card faces. Familiar folders.';
 intro.querySelector('p').textContent='The existing A/B/C shells, now holding the seven Lagoon Glass colorways. Choose the first color to review another six-card sample set.';
 const links=document.createElement('nav');links.setAttribute('aria-label','First sample card color');links.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:24px';
 for(const c of d.faceCollection){const a=document.createElement('a');a.textContent=c.name;a.href='?face='+encodeURIComponent(c.id);a.className='quiet';a.style.cssText='min-height:48px;display:flex;align-items:center;text-decoration:none;margin:0';links.append(a);}intro.append(links);
 const options={};for(const key of ['concept','orientation'])if(params.has(key))options[key]=params.get(key);
 if(params.has('count'))options.count=Number(params.get('count'));if(Object.keys(options).length)window.folderPreview.set(options);
 if(params.get('open')==='1')document.querySelector('#canvas .folder').click();
 // Photos in the old review are replaced by the new collection's fictional artwork.
 const footer=document.querySelector('footer');footer.textContent='Combined design review only. Existing folder concepts preserved. All card artwork is original Lagoon Glass preview material; no Wallet data is used.';
})();
