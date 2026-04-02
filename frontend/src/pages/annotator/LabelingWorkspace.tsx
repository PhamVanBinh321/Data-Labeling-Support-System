import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ReactPictureAnnotation } from 'react-picture-annotation';
import {
  ArrowLeft, Save, Square, ChevronLeft, ChevronRight,
  Trash2, Tag, BookOpen, ChevronDown, ChevronUp,
  MessageSquare, Shield, AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import type { LabelDefinition } from '../../data/mockData';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { annotationsApi } from '../../api/annotations';
import { projectsApi } from '../../api/projects';
import TaskReviewModal from '../../components/reviewer/TaskReviewModal';
import './LabelingWorkspace.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';



interface IAnnotation {
  id: string;
  mark: { x: number; y: number; width: number; height: number; type: string };
  comment: string;
}

interface EnrichedAnnotation extends IAnnotation {
  labelId: string;
  labelColor: string;
  labelName: string;
}

// ── localStorage helpers ──
const LS_ANN_KEY       = (tid: string, idx: number) => `ann_${tid}_${idx}`;
const LS_CONFIRM_KEY   = (tid: string, idx: number) => `confirm_${tid}_${idx}`;

const loadAnnotations = (tid: string, idx: number): EnrichedAnnotation[] => {
  try {
    const raw = localStorage.getItem(LS_ANN_KEY(tid, idx));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const isImageConfirmed = (tid: string, idx: number) =>
  localStorage.getItem(LS_CONFIRM_KEY(tid, idx)) === 'true';

const LabelingWorkspace: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReviewer = searchParams.get('mode') === 'reviewer';

  const { tasks, getProjectById, updateTaskStatus } = useData();
  const task = tasks.find(t => t.id === taskId) ?? tasks[0];
  const projectFromCtx = getProjectById(task?.projectId ?? '');

  // ── Labels — fetch project detail (list API không có labels) ──
  const [labels, setLabels] = useState<LabelDefinition[]>(projectFromCtx?.labels ?? []);
  useEffect(() => {
    if (!task?.projectId) return;
    projectsApi.get(Number(task.projectId))
      .then((p: any) => {
        if (p?.labels?.length > 0) {
          setLabels(p.labels.map((l: any) => ({ id: String(l.id), name: l.name, color: l.color, attributes: l.attributes ?? [] })));
        }
      })
      .catch(() => {});
  }, [task?.projectId]);

  // ── Auto-transition pending/rejected → in-progress khi mở workspace ──
  useEffect(() => {
    if ((task?.status === 'pending' || task?.status === 'rejected') && !isReviewer) {
      updateTaskStatus(task.id, 'in-progress').catch(() => {});
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API images state ──
  const [apiImages, setApiImages] = useState<any[]>([]);

  useEffect(() => {
    if (!taskId) return;
    annotationsApi.listImages(Number(taskId))
      .then((imgs: any[]) => {
        if (imgs?.length > 0) {
          setApiImages(imgs);
          // Sync bất kỳ annotation nào còn trong localStorage lên DB
          imgs.forEach((img: any, idx: number) => {
            const cached = loadAnnotations(taskId, idx);
            if (cached.length > 0 && img.id) {
              annotationsApi.bulkSave(img.id, cached.map((ann: EnrichedAnnotation) => ({
                label_id: ann.labelId || 'unlabeled',
                label_name: ann.labelName || 'unlabeled',
                label_color: ann.labelColor?.length === 7 ? ann.labelColor : '#cccccc',
                annotation_type: 'bounding_box',
                x: ann.mark.x,
                y: ann.mark.y,
                width: ann.mark.width,
                height: ann.mark.height,
                comment: ann.comment,
              }))).catch(() => {});
            }
          });
        }
      })
      .catch(() => {});
  }, [taskId]);

  const totalImages = apiImages.length > 0 ? apiImages.length : (task?.totalImages ?? 0);
  const project = projectFromCtx;
  const rejectInfo = task?.rejectReason ? { reviewer: 'Reviewer', comment: task.rejectReason } : undefined;

  // ── Core state ──
  const [imageIdx, setImageIdx]    = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Annotations — loaded SYNCHRONOUSLY on image switch (no useEffect lag)
  const [enriched, setEnriched]    = useState<EnrichedAnnotation[]>(() => loadAnnotations(task?.id ?? '', 0));

  const [activeLabel, setActiveLabel]  = useState<LabelDefinition>({ id: '', name: '', color: '#f97316' });

  // Cập nhật activeLabel khi labels load xong
  useEffect(() => {
    if (labels.length > 0 && !activeLabel.id) {
      setActiveLabel(labels[0]);
    }
  }, [labels]);
  const [selectedId, setSelectedId]    = useState<string | null>(null);
  const [confirmed, setConfirmed]      = useState<boolean>(() => isImageConfirmed(task?.id ?? '', 0));
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [rejectOpen, setRejectOpen]    = useState(!!rejectInfo);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Chặn scroll zoom của react-picture-annotation ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  // ── Canvas size — scale ảnh fit container, giữ tỉ lệ ──
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const cW = containerRef.current.clientWidth;
      const cH = containerRef.current.clientHeight;
      const img = apiImages[imageIdx];
      if (img?.width > 0 && img?.height > 0) {
        const scale = Math.min(cW / img.width, cH / img.height); // không cap 1, cho phép scale lên
        setCanvasSize({ width: Math.floor(img.width * scale), height: Math.floor(img.height * scale) });
      } else {
        setCanvasSize({ width: cW, height: cH });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imageIdx, apiImages]);

  // ── Save to localStorage + API (fire-and-forget) ──
  const saveToLS = useCallback((anns: EnrichedAnnotation[], idx: number) => {
    const tid = task?.id ?? '';
    localStorage.setItem(LS_ANN_KEY(tid, idx), JSON.stringify(anns));
    const imageId = apiImages[idx]?.id;
    if (imageId) {
      annotationsApi.bulkSave(imageId, anns.map(ann => ({
        label_id: ann.labelId,
        label_name: ann.labelName,
        label_color: ann.labelColor,
        annotation_type: 'bounding_box',
        x: ann.mark.x,
        y: ann.mark.y,
        width: ann.mark.width,
        height: ann.mark.height,
        comment: ann.comment,
      }))).catch(() => {});
    }
  }, [task?.id, apiImages]);

  // ── Navigate images — load annotations từ localStorage, fallback sang API ──
  const goToImage = useCallback(async (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= totalImages) return;
    const tid = task?.id ?? '';
    let nextAnns = loadAnnotations(tid, nextIdx);
    // Nếu localStorage trống và có API image → thử load từ API
    if (nextAnns.length === 0 && apiImages[nextIdx]?.id) {
      try {
        const apiAnns: any[] = await annotationsApi.list(apiImages[nextIdx].id) ?? [];
        nextAnns = apiAnns.map((a: any) => ({
          id: String(a.id),
          mark: { x: a.x, y: a.y, width: a.width, height: a.height, type: 'RECT' },
          comment: a.label_name,
          labelId: String(a.label_id),
          labelColor: a.label_color,
          labelName: a.label_name,
        }));
        if (nextAnns.length > 0) localStorage.setItem(LS_ANN_KEY(tid, nextIdx), JSON.stringify(nextAnns));
      } catch {}
    }
    const nextConfirmed = isImageConfirmed(tid, nextIdx) || (apiImages[nextIdx]?.is_confirmed ?? false);
    setImageIdx(nextIdx);
    setEnriched(nextAnns);
    setConfirmed(nextConfirmed);
    setSelectedId(null);
  }, [task?.id, totalImages, apiImages]);

  const goNext = useCallback(() => goToImage(imageIdx + 1), [imageIdx, goToImage]);
  const goPrev = useCallback(() => goToImage(imageIdx - 1), [imageIdx, goToImage]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'n' || e.key === 'N') goNext();
      if (e.key === 'p' || e.key === 'P') goPrev();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) deleteBox(selectedId);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── onChange from react-picture-annotation ──
  const handleChange = (data: IAnnotation[]) => {
    const newEnriched: EnrichedAnnotation[] = data.map(ann => {
      const existing = enriched.find(e => e.id === ann.id);
      if (existing) return { ...existing, mark: ann.mark };
      return {
        ...ann,
        comment:    activeLabel.name,
        labelId:    activeLabel.id,
        labelColor: activeLabel.color,
        labelName:  activeLabel.name,
      };
    });
    setEnriched(newEnriched);
    saveToLS(newEnriched, imageIdx);
    if (newEnriched.length > enriched.length) {
      setConfirmed(false);
      localStorage.removeItem(LS_CONFIRM_KEY(task?.id ?? '', imageIdx));
    }
  };

  const deleteBox = (id: string) => {
    const next = enriched.filter(a => a.id !== id);
    setEnriched(next);
    saveToLS(next, imageIdx);
    if (selectedId === id) setSelectedId(null);
  };

  const changeLabelForBox = (annId: string, label: LabelDefinition) => {
    const next = enriched.map(a => a.id === annId
      ? { ...a, comment: label.name, labelId: label.id, labelColor: label.color, labelName: label.name }
      : a
    );
    setEnriched(next);
    saveToLS(next, imageIdx);
  };

  // ── Confirm current image — save → confirm (đảm bảo annotations vào DB) ──
  const handleConfirmImage = async () => {
    localStorage.setItem(LS_CONFIRM_KEY(task?.id ?? '', imageIdx), 'true');
    setConfirmed(true);
    const imageId = apiImages[imageIdx]?.id;
    if (imageId) {
      // Luôn sync annotations lên API trước khi confirm (fix race condition)
      try {
        await annotationsApi.bulkSave(imageId, enriched.map(ann => ({
          label_id: ann.labelId || 'unlabeled',
          label_name: ann.labelName || 'unlabeled',
          label_color: ann.labelColor?.length === 7 ? ann.labelColor : '#cccccc',
          annotation_type: 'bounding_box',
          x: ann.mark.x,
          y: ann.mark.y,
          width: ann.mark.width,
          height: ann.mark.height,
          comment: ann.comment,
        })));
      } catch { /* silent */ }
      annotationsApi.confirmImage(imageId).catch(() => { /* silent */ });
    }
    toast.success(`✅ Đã xác nhận ảnh ${imageIdx + 1}/${totalImages}`);
    // Auto-advance to next if not last
    if (imageIdx < totalImages - 1) {
      setTimeout(() => goToImage(imageIdx + 1), 600);
    }
  };

  // ── Submit whole task ──
  const handleSubmit = async () => {
    if (isReviewer) {
      setShowReviewModal(true);
      return;
    }
    const confirmedCount = Array.from({ length: totalImages }, (_, i) =>
      isImageConfirmed(task?.id ?? '', i)
    ).filter(Boolean).length;

    if (confirmedCount < totalImages) {
      toast(`⚠️ Bạn mới xác nhận ${confirmedCount}/${totalImages} ảnh. Tiếp tục nộp?`, {
        icon: '⚠️',
        duration: 4000,
      });
    }
    // Sync ảnh hiện tại lên API trước khi submit (phòng trường hợp chưa confirm)
    const imageId = apiImages[imageIdx]?.id;
    if (imageId && enriched.length > 0) {
      try {
        await annotationsApi.bulkSave(imageId, enriched.map(ann => ({
          label_id: ann.labelId || 'unlabeled',
          label_name: ann.labelName || 'unlabeled',
          label_color: ann.labelColor?.length === 7 ? ann.labelColor : '#cccccc',
          annotation_type: 'bounding_box',
          x: ann.mark.x,
          y: ann.mark.y,
          width: ann.mark.width,
          height: ann.mark.height,
          comment: ann.comment,
        })));
      } catch { /* silent */ }
    }
    try {
      await updateTaskStatus(task.id, 'in-review');
    } catch { /* optimistic update already applied in DataContext */ }
    toast.success('✅ Đã nộp thành công! Task chuyển sang trạng thái In-Review.');
    setTimeout(() => navigate('/annotator/tasks'), 1500);
  };

  // Confirmed count for progress display
  const confirmedCount = Array.from({ length: totalImages }, (_, i) =>
    isImageConfirmed(task?.id ?? '', i)
  ).filter(Boolean).length;

  return (
    <div className="workspace-layout">
      {/* ── Topbar ── */}
      <header className="workspace-topbar">
        <div className="topbar-left">
          <button className="btn-icon" onClick={() => navigate(-1)} title="Quay lại">
            <ArrowLeft size={20} />
          </button>
          <div className="task-meta">
            <h2>{project?.name ?? task.name}</h2>
            <span>{task.name} · Đã xác nhận: {confirmedCount}/{totalImages} ảnh</span>
          </div>
        </div>

        {/* Image navigation */}
        <div className="topbar-nav">
          <button className="nav-btn" onClick={goPrev} disabled={imageIdx === 0} title="Ảnh trước (P)">
            <ChevronLeft size={18} />
          </button>
          <div className="nav-progress">
            <div className="nav-bar">
              {/* grey = total, green = confirmed */}
              <div className="nav-fill-confirmed" style={{ width: `${(confirmedCount / totalImages) * 100}%` }} />
              <div className="nav-fill-current"   style={{ width: `${((imageIdx + 1) / totalImages) * 100}%` }} />
            </div>
            <span>Ảnh {imageIdx + 1} / {totalImages}</span>
          </div>
          <button className="nav-btn" onClick={goNext} disabled={imageIdx === totalImages - 1} title="Ảnh tiếp (N)">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="topbar-right">
          {rejectInfo && (
            <button className={`topbar-reject-btn ${rejectOpen ? 'active' : ''}`} onClick={() => setRejectOpen(o => !o)}>
              <AlertTriangle size={15} /> Lý do từ chối
            </button>
          )}
          <button className="btn btn-primary btn-icon-text" onClick={handleSubmit}>
            <Save size={16} /> {isReviewer ? 'Hoàn tất Review' : 'Nộp bài'}
          </button>
        </div>
      </header>

      {/* ── Reject feedback bar ── */}
      {rejectInfo && rejectOpen && (
        <div className="reject-feedback-bar">
          <MessageSquare size={16} />
          <div className="rfb-content">
            <strong>Phản hồi từ Reviewer</strong>
            <span className="rfb-reviewer"><Shield size={12} /> {rejectInfo.reviewer}:</span>
            <span>{rejectInfo.comment}</span>
          </div>
          <button className="rfb-close" onClick={() => setRejectOpen(false)}><ChevronUp size={16} /></button>
        </div>
      )}

      {/* ── Main ── */}
      <div className="workspace-main">
        {/* Left toolbar */}
        <aside className="workspace-toolbar">
          <div className="tool-group">
            <button className="tool-btn active" title="Bounding Box">
              <Square size={22} />
            </button>
          </div>
          <div className="toolbar-hint">
            <span>N</span><span>P</span><span>Del</span>
          </div>
        </aside>

        <div className="workspace-canvas" ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
          <div style={{ width: canvasSize.width, height: canvasSize.height, flexShrink: 0 }}>
            <ReactPictureAnnotation
              key={`${task?.id}_${imageIdx}`}
              image={apiImages[imageIdx]?.url || undefined}
              onSelect={setSelectedId as any}
              onChange={handleChange as any}
              width={canvasSize.width}
              height={canvasSize.height}
              annotationData={enriched as any}
              defaultAnnotationSize={[] as any}
            />
          </div>

          {/* Confirmed overlay */}
          {confirmed && (
            <div className="confirmed-overlay">
              <CheckCircle2 size={28} className="co-icon" />
              <span>Ảnh đã được xác nhận</span>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="workspace-sidebar">

          {/* Confirm button — prominent at top */}
          <div className="sidebar-section confirm-section">
            <button
              className={`btn-confirm-image ${confirmed ? 'confirmed' : ''}`}
              onClick={handleConfirmImage}
              disabled={confirmed}
            >
              <CheckCircle2 size={17} />
              {confirmed ? (isReviewer ? 'Đạt (Pass)' : 'Đã xác nhận') : (isReviewer ? 'Đánh giá Đạt' : 'Xác nhận ảnh này')}
            </button>
            <p className="confirm-hint">{enriched.length} box · Ảnh {imageIdx + 1}/{totalImages}</p>
          </div>

          {/* Active label picker */}
          <div className="sidebar-section">
            <div className="section-header">
              <Tag size={14} />
              <h3>Nhãn đang vẽ</h3>
            </div>
            <div className="labels-list">
              {labels.map(lbl => (
                <div
                  key={lbl.id}
                  className={`label-item ${activeLabel.id === lbl.id ? 'active' : ''}`}
                  onClick={() => setActiveLabel(lbl)}
                >
                  <span className="label-color" style={{ backgroundColor: lbl.color }} />
                  <span className="label-name">{lbl.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instances list */}
          <div className="sidebar-section instances-section">
            <div className="section-header">
              <h3>Đối tượng đã gắn</h3>
              <span className="badge">{enriched.length}</span>
            </div>
            <div className="instances-content">
              {enriched.length === 0
                ? <div className="empty-instances">Chưa có box nào. Kéo để vẽ.</div>
                : (
                  <ul className="instance-list">
                    {enriched.map((ann, idx) => (
                      <li
                        key={ann.id}
                        className={`instance-item ${selectedId === ann.id ? 'active' : ''}`}
                        onClick={() => setSelectedId(ann.id)}
                      >
                        <span className="instance-color" style={{ backgroundColor: ann.labelColor || activeLabel.color }} />
                        <div className="instance-info">
                          <span className="instance-name">{ann.labelName || `Box ${idx + 1}`}</span>
                          <select
                            className="instance-label-select"
                            value={ann.labelId || ''}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const lbl = labels.find(l => l.id === e.target.value);
                              if (lbl) changeLabelForBox(ann.id, lbl);
                            }}
                          >
                            {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </div>
                        <button
                          className="instance-delete"
                          title="Xoá (Del)"
                          onClick={e => { e.stopPropagation(); deleteBox(ann.id); }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              }
            </div>
          </div>

          {/* Guidelines collapsible */}
          {project?.guidelines && (
            <div className="sidebar-section guidelines-section">
              <button className="guidelines-toggle" onClick={() => setGuidelinesOpen(o => !o)}>
                <BookOpen size={14} />
                <span>Hướng dẫn</span>
                {guidelinesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {guidelinesOpen && <pre className="guidelines-text">{project.guidelines}</pre>}
            </div>
          )}
        </aside>
      </div>

      {showReviewModal && task && (
        <TaskReviewModal 
          task={task} 
          onClose={() => setShowReviewModal(false)} 
        />
      )}
    </div>
  );
};

export default LabelingWorkspace;
