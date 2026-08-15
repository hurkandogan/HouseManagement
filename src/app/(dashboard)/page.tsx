"use client";

import React, { useEffect, useState } from "react";
import { useYear } from "@/lib/contexts/YearContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Receipt, FileText, TrendingUp, Loader2 } from "lucide-react";
import { getExpenses, Expense } from "@/app/actions/expenses";
import { getProperties, Property } from "@/app/actions/properties";
import { getContracts, Contract } from "@/app/actions/contracts";
import { getCategories, Category } from "@/app/actions/categories";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";

export default function DashboardPage() {
  const { selectedYear } = useYear();
  const [loading, setLoading] = useState(true);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [props, exps, conts, cats] = await Promise.all([
          getProperties(),
          getExpenses(),
          getContracts(),
          getCategories()
        ]);
        setProperties(props);
        setExpenses(exps);
        setContracts(conts);
        setCategories(cats);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter data for the selected year
  // For Expenses: we check if the expense date string starts with the year
  const yearExpenses = expenses.filter(exp => !exp.isArchived && exp.date.startsWith(selectedYear));
  
  // Calculate Totals
  const totalExpenses = yearExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const activeContractsCount = contracts.filter(c => c.status === "active").length;

  // Process Monthly Data for Bar Chart
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    name: new Date(2000, i, 1).toLocaleString("en-US", { month: "short" }),
    amount: 0
  }));

  yearExpenses.forEach(exp => {
    const monthIndex = new Date(exp.date).getMonth();
    monthlyData[monthIndex].amount += exp.amount;
  });

  // Process Category Data for Pie Chart
  const categoryTotals: Record<string, number> = {};
  yearExpenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });
  const pieData = Object.entries(categoryTotals)
    .filter(([_, val]) => val > 0)
    .map(([key, val]) => {
      const cat = categories.find(c => c.value === key);
      return {
        name: cat?.label || key,
        value: val,
        color: cat?.color || "#64748b"
      };
    });

  // Get Recent Activity (Top 5 most recent expenses from this year)
  const recentActivity = [...yearExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value));
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Overview <span className="text-indigo-400">({selectedYear})</span></h2>
          <p className="text-zinc-400 text-sm">Here is the summary of your properties and expenses for {selectedYear}.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Total Expenses Card */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Total Expenses</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Receipt className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(totalExpenses)}</div>
            <div className="flex items-center text-xs text-zinc-500">
              <span className="text-zinc-400 font-medium">In {selectedYear}</span>
            </div>
          </CardContent>
        </Card>

        {/* Average Monthly Spend Card */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Avg. Monthly Spend</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(totalExpenses / 12)}
            </div>
            <p className="text-xs text-zinc-500">
              Average across 12 months
            </p>
          </CardContent>
        </Card>

        {/* Active Properties Card */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Active Properties</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Building2 className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{properties.length}</div>
            <p className="text-xs text-zinc-500">
              Managed buildings & units
            </p>
          </CardContent>
        </Card>

        {/* Contracts Card */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Active Contracts</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <FileText className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{activeContractsCount}</div>
            <p className="text-xs text-zinc-500">
              Service & insurance agreements
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-7 mt-8">
        {/* Main Chart Area */}
        <Card className="md:col-span-4 lg:col-span-5 bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl min-h-[350px]">
          <CardHeader>
             <CardTitle className="text-lg font-medium text-zinc-100">Expense Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            {totalExpenses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `€${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                    formatter={(value: any) => [formatCurrency(value), "Amount"]}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <TrendingUp className="h-8 w-8 text-zinc-600 mb-2" />
                <p>No expenses recorded in {selectedYear}.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Sidebar Analytics */}
        <div className="md:col-span-3 lg:col-span-2 space-y-6">
          
          {/* Donut Chart */}
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-zinc-500">No data available</span>
              )}
            </CardContent>
            {pieData.length > 0 && (
              <div className="px-6 pb-4 flex flex-wrap gap-3 justify-center">
                {pieData.map(entry => (
                   <div key={entry.name} className="flex items-center text-xs text-zinc-400">
                     <span className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
                     {entry.name}
                   </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm text-zinc-100 font-medium truncate max-w-[120px]">{exp.title}</p>
                        <p className="text-xs text-zinc-500">{format(new Date(exp.date), "dd.MM.yyyy")}</p>
                      </div>
                      <div className="text-sm font-semibold text-white bg-zinc-800/50 px-2 py-1 rounded-md">
                        {formatCurrency(exp.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[100px] text-center">
                   <p className="text-xs text-zinc-500">No recent activity found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
