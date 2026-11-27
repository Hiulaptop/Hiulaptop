(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Progressive scroll reveal */
  const revealEls = document.querySelectorAll('.reveal');
  if (!reduceMotion.matches && 'IntersectionObserver' in window && revealEls.length) {
    document.documentElement.classList.add('js-anim');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    for (const el of revealEls) {
      io.observe(el);
    }
  }

  /* Interactive ThinkAlgo Architecture Diagram */
  const root = document.querySelector('[data-arch-root]');
  if (!root) return;

  const svg = root.querySelector('.arch-svg');
  const packetsLayer = root.querySelector('[data-arch-packets]');
  const tabs = Array.from(root.querySelectorAll('.arch-tab'));
  const playBtn = root.querySelector('[data-arch-play]');
  const resetBtn = root.querySelector('[data-arch-reset]');
  const repoPills = Array.from(root.querySelectorAll('[data-repo-pill]'));
  const svgNodes = Array.from(svg.querySelectorAll('.svg-node'));
  const svgEdges = Array.from(svg.querySelectorAll('.svg-edge'));
  const svgLabels = Array.from(svg.querySelectorAll('.svg-edge-lbl'));

  const inspectorBadge = root.querySelector('[data-inspector-badge]');
  const inspectorTitle = root.querySelector('[data-inspector-title]');
  const inspectorBody = root.querySelector('[data-inspector-body]');
  const inspectorComm = root.querySelector('[data-inspector-comm]');

  const FLOW_INFO = {
    all: {
      badge: 'TOÀN HỆ THỐNG',
      title: '5 repo, một lớp điều phối dùng chung',
      body: 'Học viên học và nộp bài trên LMS. Mọi việc nặng — biên dịch, chấm bài, tạo học liệu — đều thành job đi qua NATS và Coordinator tới đúng pool worker. Nexus quyết định worker nào và loại job nào được phép chạy; Station dựng tất cả.',
      comm: 'Bấm vào từng repo trên sơ đồ hoặc thanh 5 repo phía dưới để xem chi tiết giao tiếp.'
    },
    learning: {
      badge: 'HỌC TẬP & SSO',
      title: 'Đăng nhập một lần cho học viên và quản trị',
      body: 'Người dùng đi qua Cloudflare Tunnel vào thinkalgo-lms (học tập, đề bài, contest) hoặc thinkalgo-nexus (quản trị). Hai ứng dụng dùng chung Keycloak SSO theo chuẩn OIDC, mỗi app có client và phiên riêng.',
      comm: 'Người dùng → Cloudflare Tunnel (HTTPS) → thinkalgo-lms / thinkalgo-nexus ↔ Keycloak (OIDC) → PostgreSQL'
    },
    judge: {
      badge: 'CHẤM BÀI',
      title: 'Bài nộp trên LMS được chấm qua Coordinator',
      body: 'Học viên nộp code trên LMS. LMS ghi job chấm vào NATS JOBS; Coordinator kiểm hợp đồng, chọn Judge Worker còn slot trong pool judge và giao việc. Worker kéo bộ test từ R2, biên dịch và chấm trong sandbox, rồi trả verdict qua NATS về lại LMS.',
      comm: 'thinkalgo-lms → NATS JOBS → thinkalgo-coordinator (snapshot từ thinkalgo-nexus) → dispatch → Judge Workers (bộ test từ R2) → RESULTS → thinkalgo-lms'
    },
    jobs: {
      badge: 'TẠO HỌC LIỆU',
      title: 'Labs dùng chung đường với chấm bài',
      body: 'thinkalgo-labs ghi lượt chạy kèm outbox vào DB rồi bridge đẩy vào NATS JOBS. Coordinator chọn Labs Worker còn slot và push qua dispatch.<pool>.<id>. Worker chạy xong lưu spool đĩa, trả kết quả qua WORKER_EVENTS → RESULTS → inbox của Labs và tải file lớn thẳng lên R2.',
      comm: 'thinkalgo-labs (outbox) → NATS JOBS → thinkalgo-coordinator → dispatch → Labs Workers → RESULTS → labs inbox · artifact & video → R2'
    }
  };

  const REPO_INFO = {
    lms: {
      badge: 'REPO · THINKALGO-LMS',
      title: 'thinkalgo-lms — Học tập và máy chấm bài (lms.thinkcode.vn)',
      body: 'Trang học chính của trung tâm, gồm luôn phần OJ: khóa học, lớp, bài học, bài tập, đề bài, contest, kết quả, học phí và chứng chỉ. Khi học viên nộp code, LMS tạo job chấm và nhận verdict qua NATS. Next.js render phía server, dữ liệu trong PostgreSQL, đăng nhập qua Keycloak.',
      comm: 'Giao tiếp: Cloudflare Tunnel → thinkalgo-lms ↔ Keycloak (OIDC) · job chấm → NATS JOBS → Coordinator → Judge Workers → RESULTS → LMS'
    },
    labs: {
      badge: 'REPO · THINKALGO-LABS',
      title: 'thinkalgo-labs — Xưởng tạo học liệu bằng agent',
      body: 'Chạy workflow agent (Claude Agent SDK, FFmpeg, Chromium) để soạn đề, bộ test, ảnh lời giải, video bài giảng và bài truyền thông, có bước người duyệt. Labs làm chủ vòng đời lượt chạy; worker chạy trên pool đa VPS.',
      comm: 'Giao tiếp: Labs web + bridge (outbox/inbox) ↔ NATS (JOBS / RESULTS) · Labs Workers nhận dispatch từ Coordinator, heartbeat tới NATS & Nexus, tải file lên R2'
    },
    nexus: {
      badge: 'REPO · THINKALGO-NEXUS',
      title: 'thinkalgo-nexus — Quản trị & Control Plane',
      body: 'Tạo pool, cấp token đăng ký một lần cho worker, theo dõi heartbeat và duyệt hợp đồng job (type@version) cho cả judge lẫn Labs. Phát snapshot registry để Coordinator chỉ giao việc cho worker hợp lệ.',
      comm: 'Giao tiếp: Keycloak (OIDC) · mọi worker enroll & heartbeat 10s → thinkalgo-nexus → registry snapshot cho thinkalgo-coordinator'
    },
    coordinator: {
      badge: 'REPO · THINKALGO-COORDINATOR',
      title: 'thinkalgo-coordinator — Lớp điều phối job viết bằng Go',
      body: 'Dịch vụ mỏng đứng giữa NATS JetStream và các pool worker, dùng chung cho chấm bài và tạo học liệu. Không chạy nghiệp vụ: chỉ kiểm hợp đồng job, chọn worker còn slot, push dispatch, giữ lease/fence trong PostgreSQL và đẩy kết quả về RESULTS cho đúng owner.',
      comm: 'Giao tiếp: kéo registry từ thinkalgo-nexus · nhận JOBS & đẩy RESULTS qua NATS · dispatch.<pool>.<id> tới Judge Workers và Labs Workers · attempt/lease tại PostgreSQL'
    },
    station: {
      badge: 'REPO · THINKALGO-STATION',
      title: 'thinkalgo-station — Hạ tầng tự vận hành & Runbook',
      body: 'Đóng gói core stack bằng Docker Compose với các mạng tách biệt: PostgreSQL, Keycloak, NATS JetStream, Cloudflare Tunnel, LMS, Nexus, Coordinator và Labs, cùng runbook dựng lại từ đầu. Không chứa secret.',
      comm: 'Giao tiếp: cung cấp đường vào Cloudflare Tunnel, Keycloak, bus NATS JetStream và PostgreSQL tách DB/role cho toàn hệ thống'
    }
  };

  const REPO_PEERS = {
    lms: ['users', 'tunnel', 'keycloak', 'postgres', 'nats', 'coordinator', 'judges', 'r2'],
    labs: ['tunnel', 'nats', 'coordinator', 'nexus', 'postgres', 'r2'],
    nexus: ['tunnel', 'keycloak', 'coordinator', 'workers', 'judges', 'postgres'],
    coordinator: ['nexus', 'nats', 'workers', 'judges', 'postgres'],
    station: ['users', 'lms', 'labs', 'nexus', 'coordinator', 'workers', 'judges']
  };

  let activeFlow = 'all';
  let activeRepo = null;
  let isPlaying = !reduceMotion.matches;
  let rafId = null;
  let lastTs = 0;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const packetState = [];

  function parseList(str) {
    return (str || '').trim().split(/\s+/).filter(Boolean);
  }

  function updateInspector() {
    const info = activeRepo ? REPO_INFO[activeRepo] : FLOW_INFO[activeFlow];
    if (!info) return;
    inspectorBadge.textContent = info.badge;
    inspectorTitle.textContent = info.title;
    inspectorBody.textContent = info.body;
    inspectorComm.textContent = info.comm || '';
    resetBtn.hidden = !activeRepo && activeFlow === 'all';
  }

  function rebuildPackets() {
    packetsLayer.innerHTML = '';
    packetState.length = 0;

    for (const edge of svgEdges) {
      if (!edge.classList.contains('is-active')) continue;
      const len = edge.getTotalLength();
      if (!len || len < 10) continue;

      const count = Number(edge.dataset.packets || 1);
      const speed = Number(edge.dataset.speed || 0.65);
      const pxPerSec = 58 * speed;

      for (let i = 0; i < count; i++) {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('width', '9');
        rect.setAttribute('height', '9');
        rect.setAttribute('rx', '1.5');
        rect.setAttribute('class', 'svg-packet');
        packetsLayer.appendChild(rect);

        packetState.push({
          edge,
          el: rect,
          len,
          pxPerSec,
          offset: (len / count) * i + ((packetState.length * 19) % Math.max(12, len * 0.5))
        });
      }
    }

    renderPackets(0);
  }

  function renderPackets(dtSec) {
    for (const p of packetState) {
      p.offset = (p.offset + p.pxPerSec * dtSec) % p.len;
      const pt = p.edge.getPointAtLength(p.offset);
      p.el.setAttribute('x', (pt.x - 4.5).toFixed(1));
      p.el.setAttribute('y', (pt.y - 4.5).toFixed(1));
    }
  }

  function applyVisualState() {
    const labelMap = new Map();
    for (const lbl of svgLabels) {
      labelMap.set(lbl.dataset.for, lbl);
    }

    for (const tab of tabs) {
      const selected = !activeRepo && tab.dataset.flow === activeFlow;
      tab.setAttribute('aria-selected', String(selected));
    }

    for (const pill of repoPills) {
      pill.setAttribute('aria-pressed', String(pill.dataset.repoPill === activeRepo));
    }

    const highlightSpecific = Boolean(activeRepo) || activeFlow !== 'all';
    const peers = activeRepo ? new Set(REPO_PEERS[activeRepo] || []) : null;

    for (const node of svgNodes) {
      const nodeRepo = node.dataset.repo || '';
      const nodeId = node.dataset.node || '';
      const nodeFlows = parseList(node.dataset.flows);

      let matched = true;
      let isPeer = false;
      if (activeRepo) {
        matched = nodeRepo === activeRepo;
        isPeer = !matched && peers.has(nodeId);
      } else if (activeFlow !== 'all') {
        matched = nodeFlows.includes(activeFlow);
      }

      node.classList.toggle('is-selected', Boolean(activeRepo) && nodeRepo === activeRepo);
      node.classList.toggle('is-peer', isPeer);
      node.classList.toggle('is-dimmed', highlightSpecific && !matched && !isPeer);
    }

    for (const edge of svgEdges) {
      const edgeFlows = parseList(edge.dataset.flows);
      const edgeRepos = parseList(edge.dataset.repos);

      let active = true;
      if (activeRepo) {
        active = edgeRepos.includes(activeRepo);
      } else if (activeFlow !== 'all') {
        active = edgeFlows.includes(activeFlow);
      }

      edge.classList.toggle('is-active', active);
      edge.classList.toggle('is-highlighted', highlightSpecific && active);
      edge.classList.toggle('is-dimmed', highlightSpecific && !active);
      edge.setAttribute(
        'marker-end',
        highlightSpecific && active ? 'url(#ah-gold)' : 'url(#ah-ink)'
      );

      const lbl = labelMap.get(edge.id);
      if (lbl) {
        lbl.classList.toggle('is-highlighted', highlightSpecific && active);
        lbl.classList.toggle('is-dimmed', highlightSpecific && !active);
      }
    }

    updateInspector();
    rebuildPackets();
  }

  function tick(ts) {
    if (!isPlaying) {
      rafId = null;
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.08, (ts - lastTs) / 1000);
    lastTs = ts;
    renderPackets(dt);
    rafId = window.requestAnimationFrame(tick);
  }

  function syncPlaybackUI() {
    svg.classList.toggle('is-playing', isPlaying);
    packetsLayer.style.display = isPlaying ? '' : 'none';
    playBtn.setAttribute('aria-pressed', String(isPlaying));
    playBtn.textContent = isPlaying ? 'Tạm dừng' : 'Chạy hiệu ứng';
    if (isPlaying && !rafId) {
      lastTs = 0;
      rafId = window.requestAnimationFrame(tick);
    } else if (!isPlaying && rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* Event listeners */
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      activeRepo = null;
      activeFlow = tab.dataset.flow || 'all';
      applyVisualState();
    });
  }

  function selectRepo(repo) {
    activeRepo = activeRepo === repo ? null : repo;
    applyVisualState();
  }

  for (const node of svgNodes) {
    if (node.getAttribute('role') !== 'button') continue;
    const repo = node.dataset.repo;
    if (!repo) continue;

    node.addEventListener('click', () => selectRepo(repo));
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectRepo(repo);
      }
    });
  }

  for (const pill of repoPills) {
    pill.addEventListener('click', () => {
      const repo = pill.dataset.repoPill;
      if (repo) selectRepo(repo);
    });
  }

  resetBtn.addEventListener('click', () => {
    activeRepo = null;
    activeFlow = 'all';
    applyVisualState();
  });

  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    syncPlaybackUI();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (isPlaying && !rafId) {
      lastTs = 0;
      rafId = window.requestAnimationFrame(tick);
    }
  });

  /* Init */
  applyVisualState();
  syncPlaybackUI();
})();
