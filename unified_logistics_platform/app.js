// 테스터 Chloe의 피드백을 반영하여 데이터 영구 보존 로직과 삭제 기능이 추가된 최종 최적화 코드

const appContainer = document.getElementById('app');

// 초기 기본 데이터 세팅
const defaultState = {
    role: null, 
    view: 'contacts', 
    contacts: [
        { id: 1, name: "김철수 (고객)", phone: "010-1111-2222", address: "서울시 강남구 테헤란로 123" },
        { id: 2, name: "이영희 (고객)", phone: "010-3333-4444", address: "서울시 서초구 서초대로 456" }
    ],
    deliveries: [
        { id: 101, contactId: 1, driver: "최우수 기사", status: "pending", items: "신선식품 2박스" },
        { id: 102, contactId: 2, driver: "최우수 기사", status: "completed", items: "고급 가전제품" }
    ],
    agents: [
        { name: "Chloe", role: "메인 테스터", status: "데이터 날아감 버그 발견 및 픽스 완료!", color: "#ff0055" },
        { name: "David", role: "백엔드 개발자", status: "영구 저장소(LocalStorage) 연동 알고리즘 구동 중", color: "#7000ff" },
        { name: "Emma", role: "프론트엔드 엔지니어", status: "삭제 버튼 UI 무지연 렌더링 완료", color: "#00f0ff" }
    ]
};

// 1. 데이터 영구 보존 엔진 (새로고침해도 안 날아감)
const loadState = () => {
    try {
        const saved = localStorage.getItem('logistics_sync_state');
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error("데이터 로딩 실패", e); }
    return defaultState;
};

const state = loadState();

const saveState = () => {
    localStorage.setItem('logistics_sync_state', JSON.stringify(state));
};

// 2. 메인 렌더링 엔진 (Virtual DOM 모방)
const render = () => {
    saveState(); // 화면이 바뀔 때마다 0초 딜레이로 백그라운드 자동 저장

    if (!state.role) {
        appContainer.innerHTML = `
            <div class="role-selector fade-in">
                <h1>AI Logistics Sync</h1>
                <p style="color:var(--text-muted); font-size:1.2rem">완벽하게 통합된 물류 플랫폼</p>
                <div class="role-cards">
                    <div class="card glass" onclick="setRole('admin')">
                        <i class="fas fa-laptop-code"></i>
                        <h2>관리자 본부</h2>
                        <p style="color:var(--text-muted)">고객/배송/AI 에이전트 통합 모니터링</p>
                    </div>
                    <div class="card glass" onclick="setRole('driver')">
                        <i class="fas fa-motorcycle"></i>
                        <h2>배송 기사 전용 앱</h2>
                        <p style="color:var(--text-muted)">모바일 최적화 배송 업무 처리</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (state.role === 'admin') {
        appContainer.innerHTML = `
            <div class="dashboard fade-in">
                <nav class="sidebar glass">
                    <div class="sidebar-logo"><i class="fas fa-globe"></i> Logistics Sync</div>
                    <div class="nav-item ${state.view === 'contacts' ? 'active' : ''}" onclick="setView('contacts')">
                        <i class="fas fa-users"></i> 주소록 & 고객 관리
                    </div>
                    <div class="nav-item ${state.view === 'deliveries' ? 'active' : ''}" onclick="setView('deliveries')">
                        <i class="fas fa-box-open"></i> 통합 배송 현황
                    </div>
                    <div class="nav-item ${state.view === 'agents' ? 'active' : ''}" onclick="setView('agents')">
                        <i class="fas fa-microchip"></i> AI 관제 센터
                    </div>
                    <div style="margin-top:auto" class="nav-item" onclick="setRole(null)">
                        <i class="fas fa-sign-out-alt"></i> 로그아웃
                    </div>
                </nav>
                <main class="main-content">
                    ${renderAdminContent()}
                </main>
            </div>
        `;
    } else if (state.role === 'driver') {
        appContainer.innerHTML = `
            <div class="mobile-app fade-in">
                <header class="mobile-header"><i class="fas fa-route"></i> 내 배송 목록 (최우수 기사)</header>
                <div class="mobile-content">
                    ${renderDriverContent()}
                </div>
                <nav class="mobile-nav">
                    <div class="m-nav-item active"><i class="fas fa-boxes fa-lg"></i><span>오늘의 배송</span></div>
                    <div class="m-nav-item" onclick="setRole(null)"><i class="fas fa-door-open fa-lg"></i><span>업무 종료</span></div>
                </nav>
            </div>
        `;
    }
};

const renderAdminContent = () => {
    if (state.view === 'contacts') {
        return `
            <h2 style="margin-bottom:2rem; font-size:2rem"><i class="fas fa-users"></i> 주소록 & 고객 관리</h2>
            <div class="glass" style="padding:1.5rem; margin-bottom:2rem; display:flex; gap:1rem; align-items:center;">
                <input type="text" id="cName" placeholder="고객명" class="glass" style="padding:1rem; border:none; color:#fff; flex:1; outline:none">
                <input type="text" id="cPhone" placeholder="전화번호" class="glass" style="padding:1rem; border:none; color:#fff; flex:1; outline:none">
                <input type="text" id="cAddr" placeholder="배송 주소 입력" class="glass" style="padding:1rem; border:none; color:#fff; flex:2; outline:none">
                <button class="btn btn-primary" onclick="addContact()">신규 등록</button>
            </div>
            <div class="list-grid">
                ${state.contacts.map(c => `
                    <div class="list-item glass">
                        <div>
                            <h3 style="color:var(--primary); font-size:1.3rem; margin-bottom:0.5rem">${c.name}</h3>
                            <p style="color:var(--text-muted); font-size:0.95rem"><i class="fas fa-phone"></i> ${c.phone} &nbsp; | &nbsp; <i class="fas fa-map-marker-alt"></i> ${c.address}</p>
                        </div>
                        <div style="display:flex; gap:0.5rem">
                            <button class="btn btn-primary" style="background:var(--success); color:#000" onclick="createDelivery(${c.id})"><i class="fas fa-truck"></i> 배송 생성</button>
                            <button class="btn" style="background:transparent; border:1px solid var(--danger); color:var(--danger)" onclick="deleteContact(${c.id})"><i class="fas fa-trash"></i> 삭제</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    if (state.view === 'deliveries') {
        return `
            <h2 style="margin-bottom:2rem; font-size:2rem"><i class="fas fa-box-open"></i> 통합 배송 현황</h2>
            <div class="list-grid">
                ${state.deliveries.map(d => {
                    const c = state.contacts.find(con => con.id === d.contactId);
                    return `
                    <div class="list-item glass">
                        <div>
                            <h3 style="margin-bottom:0.5rem">${c ? c.name : '<span style="color:red">삭제된 고객</span>'} <span style="color:var(--text-muted); font-weight:400">- ${d.items}</span></h3>
                            <p style="color:var(--text-muted); font-size:0.95rem"><i class="fas fa-id-badge"></i> 담당기사: ${d.driver} &nbsp; | &nbsp; <i class="fas fa-map"></i> 목적지: ${c ? c.address : '주소 없음'}</p>
                        </div>
                        <div style="display:flex; gap:1rem; align-items:center">
                            <span class="badge ${d.status}">${d.status === 'pending' ? '배송 진행중' : '배송 완료'}</span>
                            <button class="btn" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-size:1.2rem" onclick="deleteDelivery(${d.id})" title="배송 취소"><i class="fas fa-times-circle"></i></button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }
    if (state.view === 'agents') {
        return `
            <h2 style="margin-bottom:2rem; font-size:2rem"><i class="fas fa-microchip"></i> AI 에이전트 실시간 관제 센터</h2>
            <div class="list-grid">
                ${state.agents.map(a => `
                    <div class="list-item glass" style="border-left: 5px solid ${a.color}">
                        <div>
                            <h3 style="color:${a.color}; font-size:1.3rem; margin-bottom:0.5rem">${a.name} <span style="font-size:0.9rem; color:var(--text-muted); border:1px solid #333; padding:2px 8px; border-radius:10px; margin-left:10px">${a.role}</span></h3>
                            <p style="color:#ddd">${a.status} <span class="fade-in" style="animation-iteration-count: infinite; color:${a.color}">...</span></p>
                        </div>
                        <i class="fas fa-cog fa-spin fa-2x" style="color:${a.color}"></i>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

const renderDriverContent = () => {
    const myDeliveries = state.deliveries.filter(d => d.driver === "최우수 기사");
    if(myDeliveries.length === 0) return `<div class="glass" style="padding:2rem; text-align:center; color:var(--text-muted)">현재 할당된 배송이 없습니다.</div>`;

    return `
        <div class="list-grid">
            ${myDeliveries.map(d => {
                const c = state.contacts.find(con => con.id === d.contactId);
                return `
                <div class="list-item glass" style="flex-direction:column; align-items:flex-start; gap:1.2rem; padding: 1.8rem">
                    <div style="width:100%; display:flex; justify-content:space-between; align-items:center">
                        <h3 style="color:var(--primary); font-size:1.3rem">${c ? c.name : '알수없음'} 고객님</h3>
                        <span class="badge ${d.status}">${d.status === 'pending' ? '배송 대기' : '완료됨'}</span>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; width:100%">
                        <p style="font-size:1rem; margin-bottom:0.5rem"><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> ${c ? c.address : '주소 없음'}</p>
                        <p style="color:var(--text-muted); font-size:0.9rem"><i class="fas fa-box"></i> 배송품목: ${d.items}</p>
                    </div>
                    ${d.status === 'pending' ? `<button class="btn btn-primary" style="width:100%; padding: 1.2rem; font-size: 1.1rem" onclick="completeDelivery(${d.id})"><i class="fas fa-check-circle"></i> 배송 완료 처리</button>` : ''}
                </div>
            `}).join('')}
        </div>
    `;
};

// Actions (낙관적 업데이트 및 데이터 자동 저장)
window.setRole = (role) => { state.role = role; render(); };
window.setView = (view) => { state.view = view; render(); };

window.addContact = () => {
    const n = document.getElementById('cName').value;
    const p = document.getElementById('cPhone').value;
    const a = document.getElementById('cAddr').value;
    if(n && p && a) {
        state.contacts.unshift({ id: Date.now(), name: n, phone: p, address: a });
        render(); 
    } else { alert("모든 정보를 입력해주세요."); }
};

window.deleteContact = (id) => {
    if(confirm("정말 이 고객을 삭제하시겠습니까? (기존 배송 내역은 유지됩니다)")) {
        state.contacts = state.contacts.filter(c => c.id !== id);
        render();
    }
};

window.createDelivery = (cid) => {
    const items = prompt("이 고객에게 배송할 품목을 입력하세요:", "일반 택배 박스");
    if(items) {
        state.deliveries.unshift({ id: Date.now(), contactId: cid, driver: "최우수 기사", status: "pending", items });
        alert("배송 지시가 할당되었습니다!");
        render();
    }
};

window.deleteDelivery = (id) => {
    if(confirm("이 배송 건을 정말 취소(삭제)하시겠습니까?")) {
        state.deliveries = state.deliveries.filter(d => d.id !== id);
        render();
    }
};

window.completeDelivery = (did) => {
    const d = state.deliveries.find(x => x.id === did);
    if(d) d.status = "completed";
    render(); 
};

// 앱 초기화 구동
document.addEventListener('DOMContentLoaded', render);
