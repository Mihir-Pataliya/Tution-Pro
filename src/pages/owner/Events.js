import React, { useEffect, useState } from 'react';
import { eventsAPI } from '../../api/events';
import { batchAPI } from '../../api/batchApi';
import { teacherAPI } from '../../api/teacherApi';
import { studentAPI } from '../../api/studentApi';
import './Events.css';

const CATEGORIES = ['Exam','Holiday','Class','Fee Deadline','Parent Meeting','Celebration','Festival','Annual Day','Sports Day','Competition','Workshop','Seminar','Guest Lecture','Educational Trip / Picnic','Orientation','Admission Event','Result Declaration','Parent-Teacher Activity','Staff Meeting','Teacher Training','Birthday Celebration','Farewell','Other'];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', category:'Exam', startDate:'', endDate:'', startTime:'', endTime:'', location:'', audience:'academy', batchIds:[], teacherIds:[], studentIds:[], status:'published' });

  const load = async () => {
    setLoading(true);
    try { const r = await eventsAPI.list(); setEvents(r.data?.data || []); } catch {}
    try { const b = await batchAPI.getAll(); setBatches(b.data?.data || b.data || []); } catch {}
    try { const t = await teacherAPI.getAll(); setTeachers(t.data?.data || t.data || []); } catch {}
    try { const s = await studentAPI.getAll(); setStudents(s.data?.data || s.data || []); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await eventsAPI.update(editing._id, form);
      else await eventsAPI.create(form);
      setShowModal(false); setEditing(null);
      setForm({ title:'', description:'', category:'Exam', startDate:'', endDate:'', startTime:'', endTime:'', location:'', audience:'academy', batchIds:[], teacherIds:[], studentIds:[], status:'published' });
      load();
    } catch {}
  };

  const del = async (id) => { if (!window.confirm('Delete this event?')) return; await eventsAPI.remove(id); load(); };
  const edit = (ev) => { setEditing(ev); setForm({ title:ev.title, description:ev.description||'', category:ev.category, startDate:ev.startDate?.slice(0,10)||'', endDate:ev.endDate?.slice(0,10)||'', startTime:ev.startTime||'', endTime:ev.endTime||'', location:ev.location||'', audience:ev.audience||'academy', batchIds:ev.batchIds||[], teacherIds:ev.teacherIds||[], studentIds:ev.studentIds||[], status:ev.status||'published' }); setShowModal(true); };

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startDate) >= now).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
  const thisMonth = events.filter(e => { const d=new Date(e.startDate); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
  const completed = events.filter(e => e.status === 'completed' || new Date(e.endDate||e.startDate) < now);
  const filtered = events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) && (catFilter==='all' || e.category===catFilter));

  const year = month.getFullYear(), m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m+1, 0).getDate();
  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  const hasEvent = (d) => events.some(e => { const ed=new Date(e.startDate); return ed.getFullYear()===year && ed.getMonth()===m && ed.getDate()===d; });
  const dayEvents = (d) => events.filter(e => { const ed=new Date(e.startDate); return ed.getFullYear()===year && ed.getMonth()===m && ed.getDate()===d; });

  const selectedDayEvents = selectedDate ? dayEvents(selectedDate) : [];

  return (
    <div className="events-page">
      <header className="events-header">
        <div>
          <h2>Events & Calendar</h2>
          <p>Manage exams, holidays, meetings and academy activities.</p>
        </div>
        <button className="events-add-btn" onClick={()=>{setEditing(null);setShowModal(true);}}>+ Add Event</button>
      </header>

      <section className="events-kpi">
        <div className="events-kpi-card"><div className="events-kpi-icon" style={{background:'#eeedff',color:'#5256d8'}}>📅</div><div><strong>{events.length}</strong><span>Total Events</span></div></div>
        <div className="events-kpi-card"><div className="events-kpi-icon" style={{background:'#f4eaff',color:'#9348cb'}}>⏳</div><div><strong>{upcoming.length}</strong><span>Upcoming Events</span></div></div>
        <div className="events-kpi-card"><div className="events-kpi-icon" style={{background:'#e3f8ef',color:'#21a77b'}}>📆</div><div><strong>{thisMonth.length}</strong><span>Events This Month</span></div></div>
        <div className="events-kpi-card"><div className="events-kpi-icon" style={{background:'#fff0df',color:'#e9892e'}}>✅</div><div><strong>{completed.length}</strong><span>Completed Events</span></div></div>
      </section>

      <section className="events-grid">
        <article className="events-panel">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <h3 style={{margin:0}}>Calendar</h3>
            <div>
              <button onClick={()=>setMonth(new Date(year,m-1,1))} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e8e9f1',background:'#fff',cursor:'pointer'}}>◀</button>
              <span style={{margin:'0 10px',fontWeight:700}}>{month.toLocaleString('en',{month:'long',year:'numeric'})}</span>
              <button onClick={()=>setMonth(new Date(year,m+1,1))} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e8e9f1',background:'#fff',cursor:'pointer'}}>▶</button>
            </div>
          </div>
          <div className="calendar-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={{textAlign:'center',fontSize:11,color:'#727b91',fontWeight:700,padding:4}}>{d}</div>)}
            {cells.map((d,i)=>(
              <div key={i} className={`calendar-cell ${d&&hasEvent(d)?'has-event':''} ${d===now.getDate()&&m===now.getMonth()&&year===now.getFullYear()?'today':''}`} onClick={()=>d&&setSelectedDate(d)} style={{cursor:d?'pointer':'default'}}>{d||''}</div>
            ))}
          </div>
          {selectedDate && (
            <div style={{marginTop:12}}>
              <h4 style={{margin:'0 0 8px',fontSize:13,color:'#19213c'}}>Events on {selectedDate} {month.toLocaleString('en',{month:'short'})}</h4>
              {selectedDayEvents.length===0 ? <p style={{color:'#727b91',fontSize:12}}>No events.</p> : selectedDayEvents.map(e=><div key={e._id} className="upcoming-card"><strong>{e.title}</strong><span>{e.startTime} • {e.category}</span></div>)}
            </div>
          )}
        </article>
        <article className="events-panel">
          <h3>Upcoming Events</h3>
          {loading ? <div className="events-skeleton" /> : upcoming.length===0 ? <div className="events-empty"><strong>No upcoming events</strong><p>Create your first academy event.</p><button className="events-add-btn" onClick={()=>setShowModal(true)} style={{marginTop:10}}>+ Add Event</button></div> : (
            upcoming.slice(0,6).map(e=>(
              <div className="upcoming-card" key={e._id}>
                <strong>{e.title}</strong>
                <span>{new Date(e.startDate).toLocaleDateString('en-IN')} {e.startTime} • {e.category} • {e.audience}</span>
                <div style={{marginTop:6,display:'flex',gap:8}}>
                  <button onClick={()=>edit(e)} style={{fontSize:11,color:'#4f46e5',border:'none',background:'none',cursor:'pointer'}}>Edit</button>
                  <button onClick={()=>del(e._id)} style={{fontSize:11,color:'#e85b70',border:'none',background:'none',cursor:'pointer'}}>Delete</button>
                </div>
              </div>
            ))
          )}
        </article>
      </section>

      <section className="events-panel">
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events..." style={{padding:'8px 12px',borderRadius:10,border:'1px solid #e8e9f1',flex:1,minWidth:180}} />
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1px solid #e8e9f1'}}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        {loading ? <div className="events-skeleton" /> : filtered.length===0 ? <div className="events-empty"><strong>No events found</strong></div> : (
          <table className="events-table">
            <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(e=>(
                <tr key={e._id}>
                  <td style={{fontWeight:600}}>{e.title}</td>
                  <td>{e.category}</td>
                  <td>{new Date(e.startDate).toLocaleDateString('en-IN')}</td>
                  <td>{e.status}</td>
                  <td>
                    <button onClick={()=>edit(e)} style={{marginRight:8,color:'#4f46e5',border:'none',background:'none',cursor:'pointer'}}>Edit</button>
                    <button onClick={()=>del(e._id)} style={{color:'#e85b70',border:'none',background:'none',cursor:'pointer'}}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'grid',placeItems:'center',zIndex:1000}} onClick={()=>setShowModal(false)}>
          <form onClick={e=>e.stopPropagation()} onSubmit={save} style={{background:'#fff',padding:28,borderRadius:18,width:'min(560px,92vw)',maxHeight:'88vh',overflow:'auto',display:'grid',gap:14,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <h3 style={{margin:0,fontSize:20,fontWeight:800,color:'#131c37'}}>{editing?'Edit Event':'Add Event'}</h3>
            <input required placeholder="Event title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1',fontSize:14}} />
            <textarea placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1',fontSize:14,minHeight:70}} />
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1',fontSize:14}}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <input required type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1'}} />
              <input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1'}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1'}} />
              <input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1'}} />
            </div>
            <input placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1'}} />
            <select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1'}}>
              <option value="academy">Entire Academy</option>
              <option value="batches">Selected Batches</option>
              <option value="teachers">Selected Teachers</option>
              <option value="students">Selected Students</option>
            </select>
            {form.audience==='batches' && <select multiple value={form.batchIds} onChange={e=>setForm({...form,batchIds:Array.from(e.target.selectedOptions,o=>o.value)})} style={{padding:10,borderRadius:12,border:'1px solid #e8e9f1',minHeight:90}}>{batches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}</select>}
            {form.audience==='teachers' && <select multiple value={form.teacherIds} onChange={e=>setForm({...form,teacherIds:Array.from(e.target.selectedOptions,o=>o.value)})} style={{padding:10,borderRadius:12,border:'1px solid #e8e9f1',minHeight:90}}>{teachers.map(t=><option key={t._id} value={t._id}>{t.name}</option>)}</select>}
            {form.audience==='students' && <select multiple value={form.studentIds} onChange={e=>setForm({...form,studentIds:Array.from(e.target.selectedOptions,o=>o.value)})} style={{padding:10,borderRadius:12,border:'1px solid #e8e9f1',minHeight:90}}>{students.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}</select>}
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={{padding:12,borderRadius:12,border:'1px solid #e8e9f1'}}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button type="button" onClick={()=>setShowModal(false)} style={{padding:'10px 18px',borderRadius:12,border:'1px solid #e8e9f1',background:'#fff',cursor:'pointer',fontWeight:600}}>Cancel</button>
              <button type="submit" style={{padding:'10px 18px',borderRadius:12,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',cursor:'pointer',fontWeight:700}}>Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
