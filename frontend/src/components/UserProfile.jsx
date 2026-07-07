import { useMemo } from 'react';
import { Icon } from '@iconify/react';

/**
 * 用户个人主页 — 数据画像 + AI 工作建议
 */
export default function UserProfile({ stats, workorders, feishuStatus, health }) {
  const userName = '武新萍';

  // ── 用户相关工单 ──
  const userWorkorders = useMemo(() => {
    if (!workorders?.length) return [];
    return workorders.filter((w) => {
      const owner = w.owner || '';
      const researcher = w.researcher || '';
      return owner.includes(userName) || researcher.includes(userName);
    });
  }, [workorders]);

  // ── 用户统计 ──
  const userStats = useMemo(() => {
    const total = userWorkorders.length;
    const archived = userWorkorders.filter((w) => w.status === '完成归档').length;
    const pending = userWorkorders.filter((w) => w.status !== '完成归档' && w.status !== '暂停/挂起').length;
    const blocked = userWorkorders.filter((w) => w.status === '暂停/挂起').length;
    const highRisk = userWorkorders.filter((w) => w.riskLevel === '高').length;
    const rework = userWorkorders.filter((w) => w.isRepeatedAdjustmentCandidate).length;
    const unclear = userWorkorders.filter((w) => w.isUnclearRequirement).length;
    const valid = userWorkorders.filter((w) => w.isValidForAnalysis).length;
    const completionRate = total > 0 ? Math.round((archived / total) * 100) : 0;
    const reworkRate = valid > 0 ? Math.round((rework / valid) * 100) : 0;

    // 按年级分布
    const gradeDist = {};
    userWorkorders.forEach((w) => {
      const g = w.grade || '未知';
      gradeDist[g] = (gradeDist[g] || 0) + 1;
    });
    const topGrades = Object.entries(gradeDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 按问题类型分布
    const issueDist = {};
    userWorkorders.filter(w => w.isValidForAnalysis).forEach((w) => {
      const cat = w.issueCategory || '其他';
      issueDist[cat] = (issueDist[cat] || 0) + 1;
    });
    const topIssues = Object.entries(issueDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 按状态分布
    const statusDist = {};
    userWorkorders.forEach((w) => {
      const s = w.status || '未知';
      statusDist[s] = (statusDist[s] || 0) + 1;
    });

    return { total, archived, pending, blocked, highRisk, rework, unclear, valid, completionRate, reworkRate, gradeDist: topGrades, issueDist: topIssues, statusDist };
  }, [userWorkorders]);

  // ── AI 工作建议生成 ──
  const aiSuggestions = useMemo(() => {
    const s = [];
    const rate = userStats;

    // 反复调整分析
    if (rate.rework > 0 && rate.reworkRate >= 30) {
      s.push({
        icon: 'mdi:refresh-alert',
        color: 'var(--red)',
        title: '高返工率预警',
        body: `您的返工率达到 <strong>${rate.reworkRate}%</strong>（${rate.rework} 条反复调整），远超健康阈值 15%。建议重点复盘需求沟通环节，与需求方对齐验收标准和交付口径，减少因需求理解偏差导致的返工。`,
      });
    } else if (rate.rework > 0) {
      s.push({
        icon: 'mdi:refresh-circle',
        color: 'var(--gold)',
        title: '返工工单关注',
        body: `当前有 <strong>${rate.rework} 条</strong>反复调整工单（占比 ${rate.reworkRate}%）。建议每两周回顾一次返工根因，识别高频问题类型并制定预防措施。`,
      });
    }

    // 阻塞工单处理
    if (rate.blocked > 0) {
      s.push({
        icon: 'mdi:alert-octagon-outline',
        color: 'var(--red)',
        title: '阻塞工单需立即处理',
        body: `您有 <strong>${rate.blocked} 条</strong>暂停/挂起的工单长期未处理。建议本周内逐一确认这些工单的状态：继续推进、重新激活或正式关闭，避免积压。`,
      });
    }

    // 高风险工单
    if (rate.highRisk > 0) {
      s.push({
        icon: 'mdi:shield-alert-outline',
        color: 'var(--red)',
        title: '高风险工单关注',
        body: `${rate.highRisk} 条高风险工单需要优先处理，建议按"高→中→低"优先级排序，确保高风险项在 48 小时内得到响应。`,
      });
    }

    // 需求不明确
    if (rate.unclear > rate.valid * 0.2) {
      s.push({
        icon: 'mdi:help-circle-outline',
        color: 'var(--gold)',
        title: '需求澄清建议',
        body: `${rate.unclear} 条工单存在需求不明确问题。建议在提单模板中增加"验收标准"和"参考链接"必填字段，从源头减少沟通成本。`,
      });
    }

    // 完成率分析
    if (rate.completionRate >= 85) {
      s.push({
        icon: 'mdi:trophy-outline',
        color: 'var(--green)',
        title: '完成率表现优秀',
        body: `您的工单完成率达到 <strong>${rate.completionRate}%</strong>，处于优秀水平。继续保持当前的工作节奏和质量管理方法。`,
      });
    } else if (rate.completionRate < 50) {
      s.push({
        icon: 'mdi:trending-down',
        color: 'var(--red)',
        title: '完成率偏低',
        body: `当前完成率仅 <strong>${rate.completionRate}%</strong>，建议梳理未完成工单的阻塞原因，设定每周完成目标，逐步清理积压。`,
      });
    }

    // 工作量均衡
    if (rate.total > 100) {
      s.push({
        icon: 'mdi:weight-lifter',
        color: 'var(--purple)',
        title: '高负载提醒',
        body: `您当前关联 <strong>${rate.total} 条</strong>工单，工作负载较高。建议评估是否可以分配部分工单给其他团队成员，保持单人在 80 条以内的合理负载。`,
      });
    }

    // 默认建议
    if (s.length === 0) {
      s.push({
        icon: 'mdi:thumb-up-outline',
        color: 'var(--green)',
        title: '工作状态良好',
        body: '当前工单质量指标均在健康范围内，请继续保持。建议定期查看数据看板关注趋势变化。',
      });
    }

    return s;
  }, [userStats]);

  // ── 重点工单（按优先级排列：阻塞 > 高风险 > 反复调整 > 最近更新）──
  const recentWorkorders = useMemo(() => {
    const priorityScore = (w) => {
      let score = 0;
      if (w.status === '暂停' || w.status === '暂停/挂起') score += 1000;
      if (w.riskLevel === '高') score += 500;
      if (w.isRepeatedAdjustmentCandidate) score += 200;
      if (w.status !== '完成归档') score += 100;
      return score;
    };
    return [...userWorkorders]
      .sort((a, b) => {
        const pa = priorityScore(a);
        const pb = priorityScore(b);
        if (pa !== pb) return pb - pa;
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      });
  }, [userWorkorders]);

  return (
    <div className="content-area" style={{ paddingTop: 0 }}>
      {/* ═══ 顶部：用户信息 + 核心指标 ═══ */}
      <div className="sec-header">
        <span className="sec-title">个人主页</span>
      </div>

      <div className="row-c2">
        {/* 用户卡片 */}
        <div className="panel">
          <div className="panel-hd">
            <span className="ph-t">
              <span className="ph-dot" style={{ background: 'var(--brand)' }} />
              基本信息
            </span>
          </div>
          <div className="panel-bd">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--brand-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 24, fontWeight: 700,
                boxShadow: '0 4px 14px rgba(222,16,32,0.3)'
              }}>
                {userName.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>{userName}</div>
                <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)', marginTop: 2 }}>教研负责人</div>
                <div style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)', marginTop: 4, display:'flex',alignItems:'center',gap:4 }}>
                  <Icon icon={health === '后端已连接' ? 'mdi:check-circle' : 'mdi:close-circle'}
                    width={14} height={14}
                    style={{ color: health === '后端已连接' ? 'var(--green)' : 'var(--red)' }} />
                  {health === '后端已连接' ? '系统在线' : '系统离线'}
                </div>
              </div>
            </div>

            <div className="info-cards">
              <div className="info-card" style={{ cursor: 'default' }}>
                <div className="ic-t">
                  <Icon icon="mdi:link-variant" width={14} height={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  飞书连接状态
                </div>
                <div className="ic-b" style={{ fontSize: 'var(--fs-caption)' }}>
                  {feishuStatus?.configured ? (
                    <span style={{ color: 'var(--green)' }}>
                      <Icon icon="mdi:check-circle" width={12} height={12} style={{verticalAlign:'middle'}} /> 已配置
                      {feishuStatus.hasAppToken ? ' · Token就绪' : ' · 缺App Token'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--red)' }}>
                      <Icon icon="mdi:alert-circle" width={12} height={12} style={{verticalAlign:'middle'}} /> 未配置
                    </span>
                  )}
                </div>
              </div>
              <div className="info-card" style={{ cursor: 'default' }}>
                <div className="ic-t">
                  <Icon icon="mdi:database-outline" width={14} height={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  系统数据概览
                </div>
                <div className="ic-b" style={{ fontSize: 'var(--fs-caption)' }}>
                  全库 <strong>{stats.totalRawCount || 0}</strong> 条工单 · 有效 <strong>{stats.validAnalysisCount || 0}</strong> 条 · 归档率 <strong>{stats.archiveRate || 0}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 核心指标卡 */}
        <div className="panel">
          <div className="panel-hd">
            <span className="ph-t">
              <span className="ph-dot" style={{ background: 'var(--gold)' }} />
              我的工单概览
            </span>
            <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)' }}>
              涉及 <strong style={{ color: 'var(--text-primary)' }}>{userName}</strong> · {userStats.total} 条
            </span>
          </div>
          <div className="panel-bd">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: '总工单', value: userStats.total, icon: 'mdi:package-variant-closed', color: 'var(--brand)', bg: 'var(--brand-light)' },
                { label: '已归档', value: userStats.archived, icon: 'mdi:check-circle-outline', color: 'var(--green)', bg: 'var(--green-light)' },
                { label: '进行中', value: userStats.pending, icon: 'mdi:progress-clock', color: 'var(--gold)', bg: 'var(--gold-light)' },
                { label: '阻塞/暂停', value: userStats.blocked, icon: 'mdi:pause-circle-outline', color: 'var(--red)', bg: 'var(--red-light)', danger: userStats.blocked > 0 },
                { label: '反复调整', value: `${userStats.rework} (${userStats.reworkRate}%)`, icon: 'mdi:refresh-circle', color: userStats.reworkRate >= 30 ? 'var(--red)' : 'var(--gold)', bg: userStats.reworkRate >= 30 ? 'var(--red-light)' : 'var(--gold-light)', warn: userStats.rework > 0 },
                { label: '完成率', value: `${userStats.completionRate}%`, icon: 'mdi:chart-donut', color: 'var(--teal)', bg: 'var(--teal-light)' },
              ].map((item) => (
                <div key={item.label} style={{
                  textAlign: 'center', padding: '12px 8px',
                  borderRadius: 10, border: '1px solid var(--border-subtle)',
                  background: item.danger ? 'var(--red-light)' : item.warn ? 'var(--gold-light)' : '#FFFDFC',
                }}>
                  <Icon icon={item.icon} width={20} height={20} style={{ color: item.color, marginBottom: 4 }} />
                  <div style={{
                    fontSize: 'var(--fs-display)', fontWeight: 800,
                    color: item.danger ? 'var(--red-dark)' : item.warn && userStats.reworkRate >= 30 ? 'var(--red-dark)' : 'var(--text-primary)'
                  }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 第二行：数据分布 + AI建议 ═══ */}
      <div className="row-c2">
        {/* 问题类型 & 年级分布 */}
        <div className="panel">
          <div className="panel-hd">
            <span className="ph-t">
              <span className="ph-dot" style={{ background: 'var(--brand)' }} />
              工单分布分析
            </span>
          </div>
          <div className="panel-bd">
            {/* 问题类型 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 'var(--fs-caption)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <Icon icon="mdi:tag-outline" width={14} height={14} style={{verticalAlign:'middle',marginRight:4}} />
                高频问题类型
              </div>
              <div className="rank-list">
                {userStats.issueDist.length === 0 ? (
                  <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>暂无数据</div>
                ) : (
                  userStats.issueDist.map(([name, count], i) => {
                    const maxCount = userStats.issueDist[0][1];
                    const colors = ['var(--red)', 'var(--gold)', 'var(--brand)', 'var(--purple)', 'var(--teal)'];
                    return (
                      <div key={name} className="rank-item" style={{ cursor: 'default' }}>
                        <span className="rk-num">{i + 1}</span>
                        <span className="rk-info"><span className="rk-name">{name}</span></span>
                        <span className="rk-bar">
                          <span className="rk-bar-fill" style={{
                            width: `${Math.round((count / maxCount) * 100)}%`,
                            background: colors[i] || 'var(--text-muted)'
                          }} />
                        </span>
                        <span className="rk-val">{count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 年级分布 */}
            <div>
              <div style={{ fontSize: 'var(--fs-caption)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <Icon icon="mdi:school-outline" width={14} height={14} style={{verticalAlign:'middle',marginRight:4}} />
                年级分布
              </div>
              <div className="rank-list">
                {userStats.gradeDist.length === 0 ? (
                  <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>暂无数据</div>
                ) : (
                  userStats.gradeDist.map(([name, count], i) => {
                    const maxCount = userStats.gradeDist[0][1];
                    const colors = ['var(--brand)', 'var(--purple)', 'var(--teal)', 'var(--gold)', 'var(--text-muted)'];
                    return (
                      <div key={name} className="rank-item" style={{ cursor: 'default' }}>
                        <span className="rk-num">{i + 1}</span>
                        <span className="rk-info"><span className="rk-name">{name}</span></span>
                        <span className="rk-bar">
                          <span className="rk-bar-fill" style={{
                            width: `${Math.round((count / maxCount) * 100)}%`,
                            background: colors[i] || 'var(--text-muted)'
                          }} />
                        </span>
                        <span className="rk-val">{count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI 工作建议 */}
        <div className="panel">
          <div className="panel-hd">
            <span className="ph-t">
              <span className="ph-dot" style={{ background: 'var(--purple)' }} />
              AI 工作完善建议
            </span>
            <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)' }}>
              <Icon icon="mdi:robot-outline" width={14} height={14} style={{verticalAlign:'middle'}} /> 基于数据自动生成
            </span>
          </div>
          <div className="panel-bd">
            <div className="info-cards">
              {aiSuggestions.map((s, i) => (
                <div key={i} className="info-card" style={{ borderLeft: `3px solid ${s.color}`, cursor: 'default' }}>
                  <div className="ic-t">
                    <Icon icon={s.icon} width={16} height={16} style={{ color: s.color, verticalAlign: 'middle', marginRight: 4 }} />
                    {s.title}
                  </div>
                  <div className="ic-b" dangerouslySetInnerHTML={{ __html: s.body }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 重点工单列表 ═══ */}
      <div className="sec-header">
        <span className="sec-title">我的重点工单</span>
        <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)' }}>
          <Icon icon="mdi:clipboard-list-outline" width={14} height={14} style={{verticalAlign:'middle',marginRight:4}} />
          共 {userWorkorders.length} 条 · 按优先级排列
        </span>
      </div>
      <div className="row-c3">
        {recentWorkorders.length === 0 ? (
          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-bd" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <Icon icon="mdi:inbox-outline" width={32} height={32} style={{display:'block',margin:'0 auto 8px',opacity:0.5}} />
              暂无相关工单
            </div>
          </div>
        ) : (
          recentWorkorders.slice(0, 30).map((w) => {
            const isBlocked = w.status === '暂停' || w.status === '暂停/挂起';
            const isHighRisk = w.riskLevel === '高';
            const isRework = w.isRepeatedAdjustmentCandidate;
            const isArchived = w.status === '完成归档';

            return (
              <div key={w.id} className="panel" style={{
                borderLeft: isBlocked ? '3px solid var(--red)' : isHighRisk ? '3px solid var(--red)' : isRework ? '3px solid var(--gold)' : '3px solid transparent',
              }}>
                <div className="panel-bd" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* 标签行 */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {isBlocked && <span className="tag tag-red">暂停</span>}
                    {isHighRisk && <span className="tag tag-red">高风险</span>}
                    {!isHighRisk && w.riskLevel === '中' && <span className="tag tag-orange">中风险</span>}
                    {isRework && <span className="tag tag-orange">反复调整</span>}
                    {isArchived && <span className="tag tag-green">已归档</span>}
                    {!isArchived && !isBlocked && <span className="tag tag-blue">进行中</span>}
                    <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {w.grade || '—'}{w.week ? ` · ${w.week}` : ''}
                    </span>
                  </div>

                  {/* 描述 */}
                  <div style={{
                    fontSize: 'var(--fs-body-sm)', color: 'var(--text-primary)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', fontWeight: 500,
                  }}>
                    {w.description || '未填写问题描述'}
                  </div>

                  {/* 底部信息 */}
                  <div style={{ display: 'flex', gap: 10, fontSize: 'var(--fs-overline)', color: 'var(--text-muted)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <span>
                      <Icon icon="mdi:tag-outline" width={12} height={12} style={{verticalAlign:'middle',marginRight:2}} />
                      {w.issueCategory || '未分类'}
                    </span>
                    <span>
                      <Icon icon="mdi:clock-outline" width={12} height={12} style={{verticalAlign:'middle',marginRight:2}} />
                      {w.updatedAt ? new Date(w.updatedAt).toLocaleDateString('zh-CN') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {recentWorkorders.length > 30 && (
        <div style={{ textAlign: 'center', fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', padding: 8 }}>
          还有 {recentWorkorders.length - 30} 条工单未显示...
        </div>
      )}
    </div>
  );
}
