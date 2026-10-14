import React, { useState, useEffect, useMemo } from 'react';
import { Check, Plus, Flame, TrendingUp, Trash2, Target, CalendarDays } from 'lucide-react';

// --- 工具函数 ---
// 格式化日期为 YYYY-MM-DD
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 获取过去7天的日期数组（用于生成图谱）
const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
};

// 计算单个习惯的连续打卡天数
const getStreak = (history) => {
  if (!history || history.length === 0) return 0;
  let streak = 0;
  const d = new Date();
  
  // 检查今天
  let dateStr = formatDate(d);
  if (history.includes(dateStr)) {
    streak++;
    while (true) {
      d.setDate(d.getDate() - 1);
      dateStr = formatDate(d);
      if (history.includes(dateStr)) streak++;
      else break;
    }
  } else {
    // 检查昨天（如果今天还没打卡，昨天打卡了也算保持连续）
    d.setDate(d.getDate() - 1);
    dateStr = formatDate(d);
    if (history.includes(dateStr)) {
      streak++;
      while (true) {
        d.setDate(d.getDate() - 1);
        dateStr = formatDate(d);
        if (history.includes(dateStr)) streak++;
        else break;
      }
    }
  }
  return streak;
};

export default function App() {
  // --- 状态管理 ---
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const todayStr = formatDate(new Date());
  const last7Days = useMemo(() => getLast7Days(), []);

  // --- 本地数据持久化 (LocalStorage) ---
  // 初始化加载数据
  useEffect(() => {
    const savedHabits = localStorage.getItem('local_habit_tracker_data');
    if (savedHabits) {
      try {
        setHabits(JSON.parse(savedHabits));
      } catch (e) {
        console.error("解析本地数据失败", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // 数据变动时自动保存
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('local_habit_tracker_data', JSON.stringify(habits));
    }
  }, [habits, isLoaded]);

  // --- 操作交互函数 ---
  const handleAddHabit = (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;

    const newHabitObj = {
      id: Date.now().toString(),
      name: newHabit.trim(),
      createdAt: new Date().toISOString(),
      history: [] // 存储打卡的日期字符串数组，例如 ['2026-10-12', '2026-10-14']
    };

    setHabits([...habits, newHabitObj]);
    setNewHabit('');
  };

  const toggleHabit = (habitId, targetDateStr) => {
    setHabits(habits.map(habit => {
      if (habit.id === habitId) {
        const isDone = habit.history.includes(targetDateStr);
        return {
          ...habit,
          history: isDone 
            ? habit.history.filter(d => d !== targetDateStr) // 取消打卡
            : [...habit.history, targetDateStr]              // 完成打卡
        };
      }
      return habit;
    }));
  };

  const deleteHabit = (habitId) => {
    if (window.confirm("确定要删除这个习惯吗？所有的打卡记录都会被清空。")) {
      setHabits(habits.filter(h => h.id !== habitId));
    }
  };

  // --- 全局统计数据计算 ---
  const bestStreak = habits.length > 0 
    ? Math.max(...habits.map(h => getStreak(h.history))) 
    : 0;

  let totalPossibleThisWeek = habits.length * 7;
  let totalCompletedThisWeek = 0;
  
  if (totalPossibleThisWeek > 0) {
    habits.forEach(habit => {
      last7Days.forEach(date => {
        if (habit.history.includes(formatDate(date))) {
          totalCompletedThisWeek++;
        }
      });
    });
  }
  
  const weeklyCompletionRate = totalPossibleThisWeek > 0 
    ? Math.round((totalCompletedThisWeek / totalPossibleThisWeek) * 100) 
    : 0;

  // 防止水合闪烁
  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans selection:bg-indigo-100">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 顶部标题与输入区 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="text-indigo-600 h-8 w-8" />
              习惯追踪看板
            </h1>
            <p className="text-slate-500 mt-1">
              今天是 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          
          <form onSubmit={handleAddHabit} className="flex items-center shadow-sm rounded-xl overflow-hidden bg-white border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
            <input
              type="text"
              placeholder="输入你想养成的新习惯..."
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              className="px-4 py-3 w-64 md:w-72 focus:outline-none bg-transparent"
            />
            <button 
              type="submit"
              disabled={!newHabit.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-3 transition-colors flex items-center justify-center h-full"
            >
              <Plus className="h-5 w-5" />
            </button>
          </form>
        </header>

        {/* 统计数据卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-orange-100/80 rounded-2xl">
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">最高连续打卡</p>
              <div className="flex items-baseline gap-1">
                <h2 className="text-4xl font-black text-slate-800">{bestStreak}</h2>
                <span className="text-slate-400 font-medium">天</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-emerald-100/80 rounded-2xl">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">本周整体完成率</p>
              <div className="flex items-baseline gap-1">
                <h2 className="text-4xl font-black text-slate-800">{weeklyCompletionRate}</h2>
                <span className="text-slate-400 font-medium">%</span>
              </div>
            </div>
          </div>
        </div>

        {habits.length === 0 ? (
          /* 空状态提示 */
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center flex flex-col items-center">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <CalendarDays className="h-12 w-12 text-indigo-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700">万事开头难，但你已迈出第一步</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              在右上方输入你今天想养成的新习惯（比如：“每天阅读15分钟”），开启你的自律之旅。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* 左侧：今日极简打卡 */}
            <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-6">
              <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Check className="text-indigo-500 stroke-[3]" /> 今日任务清单
              </h2>
              <div className="space-y-3">
                {habits.map((habit) => {
                  const isDoneToday = habit.history.includes(todayStr);
                  return (
                    <div 
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id, todayStr)}
                      className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                        isDoneToday 
                          ? 'bg-indigo-50/50 border-indigo-100 shadow-inner' 
                          : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`flex-shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          isDoneToday ? 'bg-indigo-600 border-indigo-600 scale-105' : 'border-slate-300 group-hover:border-indigo-400'
                        }`}>
                          {isDoneToday && <Check className="h-4 w-4 text-white stroke-[3] animate-in zoom-in" />}
                        </div>
                        <span className={`font-semibold text-lg truncate transition-colors ${
                          isDoneToday ? 'text-indigo-900/60 line-through' : 'text-slate-700 group-hover:text-slate-900'
                        }`}>
                          {habit.name}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-50"
                        title="删除习惯"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧：本周趋势图谱 (热力图) */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-hidden">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CalendarDays className="text-indigo-500 stroke-[3]" /> 本周热力图谱
              </h2>
              
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-max">
                  {/* 表头：日期 */}
                  <div className="flex items-center mb-4">
                    <div className="w-44 flex-shrink-0"></div>
                    <div className="flex gap-2">
                      {last7Days.map((date, i) => (
                        <div key={i} className="w-12 text-center flex flex-col items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {date.toLocaleDateString('zh-CN', { weekday: 'short' })}
                          </span>
                          <span className={`text-sm font-bold mt-1 ${formatDate(date) === todayStr ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md' : 'text-slate-500'}`}>
                            {date.getDate()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 习惯行数据 */}
                  <div className="space-y-4">
                    {habits.map((habit) => {
                      const currentStreak = getStreak(habit.history);
                      return (
                        <div key={habit.id} className="flex items-center group/row">
                          {/* 习惯名称与连击数 */}
                          <div className="w-44 flex-shrink-0 pr-4 flex flex-col justify-center">
                            <span className="text-sm font-bold text-slate-700 truncate block" title={habit.name}>
                              {habit.name}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold mt-1">
                              <Flame className={`h-3 w-3 ${currentStreak > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
                              {currentStreak} 天连跳
                            </span>
                          </div>

                          {/* 热力图方块区 */}
                          <div className="flex gap-2">
                            {last7Days.map((date, i) => {
                              const dateStr = formatDate(date);
                              const isDone = habit.history.includes(dateStr);
                              const isToday = dateStr === todayStr;
                              
                              return (
                                <button
                                  key={i}
                                  onClick={() => toggleHabit(habit.id, dateStr)}
                                  className={`w-12 h-12 rounded-xl transition-all duration-300 relative flex items-center justify-center border-2
                                    ${isDone 
                                      ? 'bg-indigo-500 border-indigo-500 shadow-sm shadow-indigo-200 hover:bg-indigo-600' 
                                      : 'bg-slate-50 border-transparent hover:border-indigo-200 hover:bg-indigo-50/50'
                                    }
                                    ${isToday && !isDone ? 'ring-2 ring-indigo-200 ring-offset-2 border-indigo-100' : ''}
                                  `}
                                >
                                  {isDone && <Check className="h-6 w-6 text-white/95 stroke-[3] animate-in zoom-in duration-200" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>

      {/* 补充简单的全局动画样式 */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.3); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation: zoomIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />
    </div>
  );
}