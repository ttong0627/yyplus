// 백엔드 David & 프론트엔드 Emma, 그리고 Ryan의 최적화를 거친 무지연 로직 코드

let contacts = [
    { id: 1, name: "클로이 (테스터)", phone: "010-1234-5678" },
    { id: 2, name: "알렉스 (기획자)", phone: "010-1111-2222" },
    { id: 3, name: "미아 (디자이너)", phone: "010-3333-4444" },
    { id: 4, name: "라이언 (최적화)", phone: "010-9999-8888" },
];

const contactList = document.getElementById('contactList');
const contactForm = document.getElementById('contactForm');
const searchInput = document.getElementById('searchInput');

// 비동기 렌더링 최적화 함수 (DOM Fragment 사용으로 Reflow 최소화 및 무지연 달성)
const renderContacts = async (filterText = '') => {
    try {
        contactList.innerHTML = ''; // 초기화
        
        const filtered = contacts.filter(c => 
            c.name.includes(filterText) || c.phone.includes(filterText)
        );

        if(filtered.length === 0) {
            contactList.innerHTML = `<p style="text-align:center; color:var(--text-secondary); padding: 2rem;">검색 결과가 없습니다.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        filtered.forEach(contact => {
            const card = document.createElement('div');
            card.className = 'contact-card';
            card.innerHTML = `
                <div class="contact-info">
                    <h3>${contact.name}</h3>
                    <p>${contact.phone}</p>
                </div>
                <button class="delete-btn" onclick="deleteContact(${contact.id})">삭제</button>
            `;
            fragment.appendChild(card);
        });

        contactList.appendChild(fragment);
    } catch (error) {
        console.error("렌더링 중 오류 발생:", error);
    }
};

// 연락처 추가 기능 (강력한 예외 처리 적용)
contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        
        const newContact = {
            id: Date.now(),
            name: nameInput.value,
            phone: phoneInput.value
        };

        // 낙관적 UI 업데이트: 데이터베이스 전송 전 화면에 즉시 반영하여 속도 극대화
        contacts.unshift(newContact);
        nameInput.value = '';
        phoneInput.value = '';
        
        await renderContacts(searchInput.value);
    } catch (error) {
        console.error("연락처 추가 실패:", error);
    }
});

// 삭제 기능
window.deleteContact = async (id) => {
    try {
        contacts = contacts.filter(c => c.id !== id);
        await renderContacts(searchInput.value);
    } catch (error) {
        console.error("삭제 실패:", error);
    }
};

// 실시간 무지연 검색 기능
searchInput.addEventListener('input', (e) => {
    renderContacts(e.target.value);
});

// 초기 데이터 로딩
document.addEventListener('DOMContentLoaded', () => {
    renderContacts();
});
