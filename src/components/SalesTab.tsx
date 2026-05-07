'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

interface Lead {
  id: string;
  name: string;
  platform: string;
  profile_link: string;
  reason: string;
  status: 'New' | 'Contacted' | 'Converted';
}

interface SalesInsight {
  overview: string;
  target_customers: string;
  strategy: string;
}

export default function SalesTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'New' | 'Contacted' | 'Converted'>('All');

  useEffect(() => {
    fetchSalesData();

    const leadsChannel = supabase.channel('sales_leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_leads' }, () => {
        fetchSalesData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, []);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const { data: latestPlan } = await supabase
        .from('plans')
        .select('id')
        .eq('department', 'Sales')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestPlan) {
        const { data: leadsData } = await supabase
          .from('sales_leads')
          .select('*')
          .eq('plan_id', latestPlan.id)
          .order('created_at', { ascending: false });

        if (leadsData) setLeads(leadsData as Lead[]);
      }
    } catch (err) {
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sales_leads')
        .update({ status: newStatus })
        .eq('id', leadId);
      
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l));
    } catch (err) {
      console.error('Error updating lead status:', err);
    }
  };

  const filteredLeads = leads.filter(lead => filter === 'All' || lead.status === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-[#555] text-xs font-black uppercase tracking-widest animate-pulse">Fetching Real Leads...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-20 text-center border-2 border-dashed border-[#1a1a1a] rounded-[3rem]">
        <p className="text-[#555] font-black uppercase tracking-widest text-xs italic">No Sales Leads Found. Generate a plan to begin lead extraction.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#444]">
          {filteredLeads.length} Potential Leads Identified
        </h3>
        <div className="flex gap-2">
          {['All', 'New', 'Contacted', 'Converted'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${
                filter === f ? 'bg-white text-black border-white' : 'bg-transparent text-[#555] border-[#1a1a1a] hover:border-[#333]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-[2rem] hover:border-orange-500/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#151515] border border-white/5 flex items-center justify-center text-xl">
                  {lead.platform.includes('Instagram') ? '📸' : lead.platform.includes('LinkedIn') ? '💼' : '🌐'}
                </div>
                <div>
                  <h4 className="text-white font-bold text-[15px]">{lead.name}</h4>
                  <p className="text-[10px] text-[#555] font-black uppercase tracking-widest">{lead.platform}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-[8px] font-black rounded uppercase tracking-widest border ${
                lead.status === 'Converted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                lead.status === 'Contacted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                'bg-orange-500/10 text-orange-500 border-orange-500/20'
              }`}>
                {lead.status}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6 italic border-l-2 border-[#1a1a1a] pl-4">
              "{lead.reason}"
            </p>

            <div className="flex gap-2">
              <a
                href={lead.profile_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-[#151515] hover:bg-[#222] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 text-center"
              >
                View Profile
              </a>
              <button
                onClick={() => updateLeadStatus(lead.id, lead.status === 'New' ? 'Contacted' : 'Converted')}
                className="flex-1 py-3 bg-white text-black hover:bg-orange-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
              >
                {lead.status === 'New' ? 'Contact Lead' : lead.status === 'Contacted' ? 'Mark Converted' : 'Completed'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
