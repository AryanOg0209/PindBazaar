import { useState, useEffect } from 'react';
import { getDashboardEquipment } from '../../services/dashboardApi';

const STATUS_COLOR = {
  operational: { bg: '#DCFCE7', c: '#166534', label: '✓ OK' },
  working:     { bg: '#DBEAFE', c: '#1E40AF', label: '● Active' },
  standby:     { bg: '#FEF3C7', c: '#92400E', label: '⏸ Standby' },
  maintenance: { bg: '#FEE2E2', c: '#991B1B', label: '⚠ Service' },
};

export default function LogisticsWidget({ refreshKey = 0 }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    let active = true;
    if (!data) setLoading(true);

    getDashboardEquipment()
      .then(res => { if (active) setData(res); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [refreshKey]);

  const equipment = data?.equipment || [];
  const sel = equipment[selected];
  const logistics = data?.logistics;

  useEffect(() => {
    if (selected >= equipment.length) setSelected(0);
  }, [equipment.length, selected]);

  return (
    <div className="dash-card" style={{ display:'flex', flexDirection:'column', padding:0, minHeight:340 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid #F1F5F9' }}>
        <h3 style={{ fontSize:15, fontWeight:800, color:'#111827', margin:0 }}>Field Assets & Logistics</h3>
        <span style={{ fontSize:11, fontWeight:700, color:'#166534', background:'#DCFCE7', padding:'3px 10px', borderRadius:20 }}>
          {logistics ? `${logistics.activeJobs} active • ${logistics.utilization}%` : 'Equipment'}
        </span>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* List */}
        <div style={{ width:'45%', borderRight:'1px solid #F1F5F9', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'8px 16px', background:'#FAFAFA', borderBottom:'1px solid #F1F5F9', fontSize:10, fontWeight:700, color:'#475569', textTransform:'uppercase' }}>
            Maintenance Status
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {loading ? [0,1,2].map(i => (
              <div key={i} style={{ padding:'14px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:8, background:'#F1F5F9' }} />
                <div style={{ flex:1 }}><div style={{ height:12, background:'#F1F5F9', borderRadius:4, marginBottom:6, width:'60%' }} /></div>
              </div>
            )) : equipment.length === 0 ? (
              <div style={{ padding:20, textAlign:'center', color:'#94A3B8', fontSize:12 }}>
                No equipment found.<br/>Complete your profile to track equipment.
              </div>
            ) : equipment.map((eq, i) => {
              const sc = STATUS_COLOR[eq.status] || STATUS_COLOR.operational;
              return (
                <div key={eq.id} onClick={() => setSelected(i)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid #F1F5F9', cursor:'pointer', background:selected===i ? '#F0FDF4' : 'white' }}>
                  <input type="checkbox" readOnly checked={selected===i} style={{ accentColor:'#1B4332' }} />
                  <div style={{ width:36, height:36, background:'#F8FAFC', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{eq.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{eq.type}</div>
                    <div style={{ fontSize:11, color:'#64748B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {eq.activeJobTitle ? `▶ ${eq.activeJobTitle}` : `📍 ${eq.location}`}
                    </div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:800, padding:'3px 7px', borderRadius:10, background:sc.bg, color:sc.c, flexShrink:0 }}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div style={{ flex:1, background:'#FAFAFA', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#475569', padding:'8px 14px', borderBottom:'1px solid #F1F5F9', textTransform:'uppercase' }}>Equipment Detail</div>
          {sel ? (
            <div style={{ padding:'14px', flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', background:'white', padding:'12px', borderRadius:10, boxShadow:'0 2px 6px rgba(0,0,0,.05)' }}>
                <span style={{ fontSize:26 }}>{sel.icon}</span>
                <div><div style={{ fontSize:14, fontWeight:800 }}>{sel.type}</div><div style={{ fontSize:11, color:'#64748B' }}>{sel.subtype}</div></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  ['Condition',`${sel.condition.toFixed(1)}/10`, sel.condition >= 7],
                  ['Status',sel.status.replace('_', ' '),sel.status !== 'maintenance'],
                  ['Location',sel.activeJobLocation || sel.location,true],
                  ['Next Service',sel.nextService,sel.status !== 'maintenance'],
                  ...(sel.activeJobTitle ? [['Active Job', sel.activeJobTitle, true]] : []),
                ].map(([l,v,ok],i) => (
                  <div key={i} style={{ background:'white', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', marginBottom:3, textTransform:'uppercase' }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:ok ? '#0F172A' : '#DC2626' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'white', borderRadius:10, padding:'10px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700, color:'#475569', marginBottom:6 }}>
                  <span>Health Score</span><span>{sel.condition.toFixed(1)}/10</span>
                </div>
                <div style={{ height:8, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${sel.condition*10}%`, height:'100%', borderRadius:4, background: sel.condition>=8?'#22C55E':sel.condition>=6?'#F59E0B':'#EF4444', transition:'width .5s ease' }} />
                </div>
              </div>
              {data?.aiSummary && (
                <div style={{ background:'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius:10, padding:'10px 14px', display:'flex', gap:8 }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>🤖</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.9)', fontWeight:600, lineHeight:1.5 }}>{data.aiSummary}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', fontSize:12 }}>Select equipment to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
