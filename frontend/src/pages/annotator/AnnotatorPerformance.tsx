import React, { useMemo } from 'react';
import {
  BarChart2, CheckCircle, XCircle, Clock, Star,
  TrendingUp, Award, Tag, Image
} from 'lucide-react';
import { MOCK_TASKS, MOCK_PROJECTS, MOCK_USERS } from '../../data/mockData';
import type { Task } from '../../data/mockData';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import './AnnotatorPerformance.css';

// ── Current annotator ──
const ME = MOCK_USERS.find(u => u.id === 'usr-002')!;

const AnnotatorPerformance: React.FC = () => {
  const myTasks = useMemo(() => MOCK_TASKS.filter(t => t.annotatorId === ME.id), []);

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const done      = myTasks.filter(t => ['approved', 'completed'].includes(t.status));
    const rejected  = myTasks.filter(t => t.status === 'rejected');
    const inReview  = myTasks.filter(t => t.status === 'in-review');
    const totalDone = done.reduce((s, t) => s + t.completedImages, 0);
    const totalImg  = myTasks.reduce((s, t) => s + t.totalImages, 0);
    return {
      totalTasks: myTasks.length,
      doneTasks: done.length,
      rejectedTasks: rejected.length,
      inReviewTasks: inReview.length,
      totalImagesLabeled: totalDone,
      totalImages: totalImg,
      overallPct: totalImg > 0 ? Math.round((totalDone / totalImg) * 100) : 0,
      qualityScore: ME.qualityScore ?? 0,
      tasksCompleted: ME.tasksCompleted ?? done.length,
    };
  }, [myTasks]);

  // ── Label frequency (from task types via projects) ──
  const topTypes = useMemo(() => {
    const map: Record<string, number> = {};
    myTasks.forEach(t => {
      const proj = MOCK_PROJECTS.find(p => p.id === t.projectId);
      const type = proj?.typeName ?? 'Unknown';
      map[type] = (map[type] ?? 0) + t.completedImages;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [myTasks]);

  const maxTypeCount = topTypes[0]?.[1] ?? 1;

  // ── History table columns ──
  const columns = [
    {
      key: 'name', title: 'Task',
      render: (t: Task) => {
        const proj = MOCK_PROJECTS.find(p => p.id === t.projectId);
        return (
          <div className="perf-name-cell">
            <strong>{t.name}</strong>
            <span>{proj?.name ?? '—'}</span>
          </div>
        );
      }
    },
    {
      key: 'images', title: 'Ảnh',
      render: (t: Task) => (
        <div className="perf-progress-cell">
          <span>{t.completedImages}/{t.totalImages}</span>
          <div className="perf-bar-bg">
            <div className="perf-bar-fill"
              style={{ width: `${t.totalImages > 0 ? (t.completedImages / t.totalImages) * 100 : 0}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'type', title: 'Loại',
      render: (t: Task) => {
        const proj = MOCK_PROJECTS.find(p => p.id === t.projectId);
        return <span className="perf-type">{proj?.typeName ?? '—'}</span>;
      }
    },
    { key: 'deadline', title: 'Hạn chót' },
    {
      key: 'status', title: 'Trạng thái',
      render: (t: Task) => <StatusBadge status={t.status as StatusType} />,
    },
  ];

  return (
    <div className="perf-page animate-fade-in">
      {/* Header */}
      <div className="perf-header">
        <div className="perf-avatar" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {ME.avatar}
        </div>
        <div>
          <h1><BarChart2 size={22} /> Hiệu suất của tôi</h1>
          <p className="page-subtitle">{ME.name} · {ME.email}</p>
        </div>
      </div>

      {/* Score cards row */}
      <div className="perf-score-row">
        <div className="perf-score-card primary">
          <div className="psc-icon"><Star size={22} /></div>
          <div className="psc-info">
            <span>Điểm chất lượng</span>
            <h2>{stats.qualityScore}%</h2>
          </div>
          <div className="psc-ring" style={{ '--pct': stats.qualityScore } as any}>
            <svg viewBox="0 0 36 36" className="ring-svg">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="2.5"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="2.5"
                strokeDasharray={`${stats.qualityScore} 100`} strokeLinecap="round"
                transform="rotate(-90 18 18)" />
            </svg>
          </div>
        </div>
        <div className="stat-card">
          <CheckCircle size={18} className="sc-icon green" />
          <span className="stat-label">Đã hoàn thành</span>
          <h3 className="stat-value text-green">{stats.doneTasks}</h3>
          <span className="stat-sub">{stats.tasksCompleted} tasks tổng</span>
        </div>
        <div className="stat-card">
          <Image size={18} className="sc-icon blue" />
          <span className="stat-label">Ảnh đã gán nhãn</span>
          <h3 className="stat-value" style={{ color: '#3b82f6' }}>{stats.totalImagesLabeled.toLocaleString()}</h3>
          <span className="stat-sub">{stats.overallPct}% tổng</span>
        </div>
        <div className="stat-card">
          <XCircle size={18} className="sc-icon red" />
          <span className="stat-label">Bị trả về</span>
          <h3 className="stat-value text-red">{stats.rejectedTasks}</h3>
          <span className="stat-sub">cần sửa lại</span>
        </div>
        <div className="stat-card">
          <Clock size={18} className="sc-icon orange" />
          <span className="stat-label">Đang duyệt</span>
          <h3 className="stat-value text-orange">{stats.inReviewTasks}</h3>
          <span className="stat-sub">chờ reviewer</span>
        </div>
      </div>

      {/* Two columns row */}
      <div className="perf-two-col">
        {/* Overall progress */}
        <div className="perf-card">
          <div className="perf-card-header">
            <TrendingUp size={16} />
            <h3>Tổng tiến độ</h3>
          </div>
          <div className="overall-progress">
            <div className="op-numbers">
              <span className="op-big">{stats.overallPct}%</span>
              <span className="op-sub">{stats.totalImagesLabeled.toLocaleString()} / {stats.totalImages.toLocaleString()} ảnh</span>
            </div>
            <div className="op-bar-bg">
              <div className="op-bar-fill" style={{ width: `${stats.overallPct}%` }} />
            </div>
          </div>

          {/* Task breakdown bars */}
          <div className="task-breakdown">
            {[
              { label: 'Hoàn thành', val: stats.doneTasks, color: '#10b981' },
              { label: 'Đang duyệt', val: stats.inReviewTasks, color: '#6366f1' },
              { label: 'Cần làm',    val: myTasks.filter(t => ['pending','in-progress'].includes(t.status)).length, color: '#f97316' },
              { label: 'Bị trả về', val: stats.rejectedTasks, color: '#ef4444' },
            ].map(item => (
              <div key={item.label} className="breakdown-row">
                <span className="br-label">{item.label}</span>
                <div className="br-bar-bg">
                  <div className="br-bar-fill" style={{
                    width: `${stats.totalTasks > 0 ? (item.val / stats.totalTasks) * 100 : 0}%`,
                    background: item.color
                  }} />
                </div>
                <span className="br-count" style={{ color: item.color }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top annotation types */}
        <div className="perf-card">
          <div className="perf-card-header">
            <Tag size={16} />
            <h3>Loại task đã làm nhiều nhất</h3>
          </div>
          <div className="top-types-list">
            {topTypes.length === 0
              ? <p className="empty-hint">Chưa có dữ liệu.</p>
              : topTypes.map(([type, count], i) => (
                <div key={type} className="tt-row">
                  <span className="tt-rank">#{i + 1}</span>
                  <span className="tt-type">{type}</span>
                  <div className="tt-bar-bg">
                    <div className="tt-bar-fill" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                  </div>
                  <span className="tt-count">{count.toLocaleString()} ảnh</span>
                </div>
              ))
            }
          </div>

          {/* Quality badge */}
          <div className="quality-award">
            <Award size={28} className={stats.qualityScore >= 90 ? 'gold' : stats.qualityScore >= 75 ? 'silver' : 'bronze'} />
            <div>
              <strong>
                {stats.qualityScore >= 90 ? '🏅 Annotator Xuất sắc' :
                 stats.qualityScore >= 75 ? '🥈 Annotator Tốt' :
                                            '🥉 Đang cải thiện'}
              </strong>
              <p>Dựa trên điểm chất lượng {stats.qualityScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task history table */}
      <div className="perf-card">
        <div className="perf-card-header">
          <CheckCircle size={16} />
          <h3>Lịch sử Task</h3>
          <span className="perf-card-sub">{myTasks.length} tasks được giao</span>
        </div>
        <DataTable<Task>
          data={myTasks}
          columns={columns}
          keyExtractor={t => t.id}
          pageSize={5}
        />
      </div>
    </div>
  );
};

export default AnnotatorPerformance;
