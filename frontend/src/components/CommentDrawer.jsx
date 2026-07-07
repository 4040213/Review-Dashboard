import { useEffect, useState } from 'react';
import { getTicketComments } from '../api/workorders.js';

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('zh-CN');
  } catch {
    return isoStr;
  }
}

export default function CommentDrawer({ workorder, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const recordId = workorder?.sourceRecordId || '';

  useEffect(() => {
    if (!recordId) {
      setLoading(false);
      setComments([]);
      return;
    }

    setLoading(true);
    setError('');

    getTicketComments(recordId)
      .then((data) => {
        setComments(data.comments || []);
      })
      .catch((err) => {
        console.error('Failed to load comments:', err);
        setError(err.message || '加载评论失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [recordId]);

  // ESC key to close
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!workorder) return null;

  return (
    <div className="comment-drawer-overlay" onClick={onClose}>
      <div className="comment-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="comment-drawer-header">
          <div>
            <h2>💬 评论详情</h2>
            <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-body-sm)' }}>
              工单：{workorder.description?.substring(0, 50) || '未填写'}...
            </p>
          </div>
          <button className="comment-drawer-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="comment-drawer-body">
          {loading ? (
            <div className="comment-loading">加载评论中...</div>
          ) : error ? (
            <div className="comment-error">
              <p>加载失败：{error}</p>
              <button
                className="secondary-button"
                onClick={() => {
                  setLoading(true);
                  setError('');
                  getTicketComments(recordId)
                    .then((data) => setComments(data.comments || []))
                    .catch((err) => setError(err.message || '加载失败'))
                    .finally(() => setLoading(false));
                }}
              >
                重试
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="comment-empty">
              <p style={{ color: 'var(--text-muted)' }}>暂无评论</p>
              <p className="muted" style={{ fontSize: 'var(--fs-caption)' }}>
                该工单还没有飞书评论。评论同步后会自动显示在这里。
              </p>
            </div>
          ) : (
            <div className="comment-list">
              {comments.map((comment, idx) => (
                <div
                  key={comment.feishu_reply_id || comment.feishu_comment_id || idx}
                  className={`comment-item ${comment.feishu_reply_id ? 'comment-reply' : ''}`}
                >
                  <div className="comment-item-header">
                    <span className="comment-author">{comment.author_name || '未知用户'}</span>
                    {comment.is_solved && (
                      <span className="comment-solved-tag">✅ 已解决</span>
                    )}
                  </div>
                  <p className="comment-content">{comment.content || '(无内容)'}</p>
                  <div className="comment-time">
                    {formatTime(comment.create_time)}
                    {comment.update_time && comment.update_time !== comment.create_time && (
                      <span className="comment-edited"> · 编辑于 {formatTime(comment.update_time)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
