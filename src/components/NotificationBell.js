import React, { useEffect, useState } from 'react';
import api from '../api/axios';
const notificationsAPI = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = async () => {
    try { const r = await notificationsAPI.unreadCount(); setCount(r.data?.data?.count || 0); } catch {}
  };
  const fetchItems = async () => {
    setLoading(true);
    try { const r = await notificationsAPI.list(); setItems(r.data?.data?.items || []); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchCount(); const id = setInterval(fetchCount, 30000); return () => clearInterval(id); }, []);
  useEffect(() => { if (open) fetchItems(); }, [open]);

  const markRead = async (id) => { await notificationsAPI.markRead(id); setItems(prev => prev.map(n => n._id===id ? {...n,isRead:true} : n)); setCount(c => Math.max(0,c-1)); };
  const markAll = async () => { await notificationsAPI.markAllRead(); setItems(prev => prev.map(n=>({...n,isRead:true}))); setCount(0); };

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{position:'relative',background:'none',border:'none',cursor:'pointer',fontSize:20}}>🔔{count>0 && <span style={{position:'absolute',top:-4,right:-4,background:'#ec4899',color:'#fff',borderRadius:999,padding:'1px 6px',fontSize:10,fontWeight:700}}>{count}</span>}</button>
      {open && (
        <div style={{position:'absolute',right:0,top:36,width:320,maxHeight:400,overflow:'auto',background:'#fff',border:'1px solid #e8e9f1',borderRadius:14,boxShadow:'0 12px 30px rgba(0,0,0,.15)',zIndex:1000,padding:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <strong style={{fontSize:14}}>Notifications</strong>
            <button onClick={markAll} style={{fontSize:11,color:'#4f46e5',border:'none',background:'none',cursor:'pointer'}}>Mark all read</button>
          </div>
          {loading ? <div style={{padding:20,textAlign:'center',color:'#727b91'}}>Loading...</div> : items.length===0 ? <div style={{padding:20,textAlign:'center',color:'#727b91'}}>No notifications</div> : items.map(n=>(
            <div key={n._id} style={{padding:10,borderRadius:10,background:n.isRead?'#fff':'#f7f6ff',border:'1px solid #e8e9f1',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <strong style={{fontSize:13}}>{n.title}</strong>
                {!n.isRead && <span style={{width:8,height:8,borderRadius:'50%',background:'#ec4899'}} />}
              </div>
              <p style={{margin:'4px 0',fontSize:12,color:'#727b91'}}>{n.message}</p>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#a0a4b8'}}>{new Date(n.createdAt).toLocaleString()}</span>
                {!n.isRead && <button onClick={()=>markRead(n._id)} style={{fontSize:10,color:'#4f46e5',border:'none',background:'none',cursor:'pointer'}}>Mark read</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
