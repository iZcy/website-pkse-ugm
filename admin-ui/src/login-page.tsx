import { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [q,setQ]=useState('');const [pw,setPw]=useState('');const [rs,setRs]=useState<{name:string;nim:string}[]>([]);const [err,setErr]=useState('');const [ld,setLd]=useState(false);const [sp,setSp]=useState(false);const [sd,setSd]=useState(false);const rf=useRef<HTMLDivElement>(null)
  useEffect(()=>{const h=(e:MouseEvent)=>{if(rf.current&&!rf.current.contains(e.target as Node))setSd(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  async function s(v:string){setQ(v);if(v.length<2){setRs([]);setSd(false);return}
    try{const d=await(await fetch('/rapor/api/search?q='+encodeURIComponent(v))).json();const m=(d||[]).map((x:Record<string,string>)=>({name:x.full_name||x.name,nim:x.nim}));setRs(m);setSd(m.length>0)}catch{setRs([])}}
  function sel(r:{name:string;nim:string}){setQ(r.name);setRs([]);setSd(false);setErr('')}
  async function login(e:React.FormEvent){e.preventDefault();setErr('');if(!q.trim()||!pw){setErr('Isi username dan password');return}
    setLd(true);const f=new URLSearchParams();f.set('username',q.trim());f.set('password',pw)
    try{const r=await fetch('/login',{method:'POST',body:f,redirect:'follow'});if(r.redirected)window.location.href=r.url;else setErr('Login gagal')}catch{setErr('Gagal terhubung')};setLd(false)}
  return(<div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
<div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
<div className="text-center mb-8"><div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div><h1 className="text-2xl font-bold text-slate-900">Panel Login</h1><p className="text-slate-500 text-sm mt-1">PKSE UGM</p></div>
{err&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 flex items-center gap-2 text-sm">{err}</div>}
<form onSubmit={login} className="space-y-5">
<div ref={rf}><label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
<div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>
<input value={q} onChange={e=>s(e.target.value)} onFocus={()=>rs.length>0&&setSd(true)} placeholder="Masukkan username atau cari nama..." autoComplete="off" className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"/>
{sd&&<div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-300 rounded-b-lg shadow-lg max-h-48 overflow-y-auto mt-0.5">{rs.map(r=><div key={r.nim} onClick={()=>sel(r)} className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-slate-100 last:border-0"><div className="text-sm font-medium text-slate-700">{r.name}</div></div>)}</div>}</div></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Kata Sandi</label>
<div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div>
<input type={sp?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Masukkan kata sandi" className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"/>
<button type="button" onClick={()=>setSp(!sp)} className="absolute right-3 inset-y-0 flex items-center text-slate-400 hover:text-slate-600">{sp?<EyeOffSVG/>:<EyeSVG/>}</button></div></div>
<button type="submit" disabled={ld} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition">{ld?'Memeriksa...':'Masuk'}</button>
          <div className="mt-6 text-center"><a href="/" className="text-sm text-slate-500 hover:text-blue-700 flex items-center justify-center gap-2 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>Kembali ke Beranda</a></div>
        </form></div></div>)}

function EyeSVG(){return<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
function EyeOffSVG(){return<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>}

ReactDOM.createRoot(document.getElementById('root')!).render(<App/>)
