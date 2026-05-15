import fs from 'fs';

const PROJECT_ID = 'wssc-nutrition';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// 1. 거래처 (Suppliers) - 형님이 방금 확인하신 그 빈 화면!!
const sampleSuppliers = [
  { id: 'sup_seoul_01', name: '서울농산 유통', manager: '최유통', contact: '010-1111-2222', account: '농협 302-1234-5678-90', orderType: 'auto' },
  { id: 'sup_gyeong_01', name: '경기 청과물 도매', manager: '박도매', contact: '010-3333-4444', account: '국민 111102-04-567890', orderType: 'manual' },
  { id: 'sup_meat_01', name: '우주 축산', manager: '김축산', contact: '010-5555-6666', account: '신한 110-123-456789', orderType: 'auto' }
];

// 2. 사용자 (Users)
const sampleUsers = [
  { id: 'admin_01', name: '최고관리자', role: 'admin', contact: '010-9999-0000', note: '초기 세팅 마스터 계정' },
  { id: 'user_01', name: '김사원', role: 'user', contact: '010-8888-7777', note: '발주 담당자' }
];

// 3. 보건소 (Clients) - 혹시 몰라 더 추가
const sampleClients = [
  { id: 'cli_seoul_03', name: '서초구 보건소', type: 'clinic', zone: '강남', manager: '박서초', contact: '02-555-6666', inspectTime: '11:00', inspectLocation: '1층 물류창고' },
  { id: 'cli_incheon_02', name: '남동구 보건소', type: 'clinic', zone: '인천', manager: '최남동', contact: '032-777-8888', inspectTime: '13:00', inspectLocation: '본관 1층' }
];

// 4. 품목 (Items) - 혹시 몰라 더 추가
const sampleItems = [
  { id: 'item_fruit_01', name: '제주 감귤 5kg', category: '과일', price: 15000, unit: '박스', boxQuantity: 1, unitPrice: 15000, supplierId: 'sup_gyeong_01' },
  { id: 'item_meat_01', name: '한우 국거리 500g', category: '축산물', price: 25000, unit: '팩', boxQuantity: 20, unitPrice: 500000, supplierId: 'sup_meat_01' }
];

function wrapFirestoreData(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'number') fields[key] = { integerValue: value };
    else if (typeof value === 'string') fields[key] = { stringValue: value };
    else fields[key] = { stringValue: String(value) };
  }
  return { fields };
}

async function seed() {
  console.log('🌱 DB 2차 보강 Seeding Started...');

  try {
    for (const sup of sampleSuppliers) {
      await fetch(`${BASE_URL}/suppliers?documentId=${sup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrapFirestoreData(sup))
      });
      console.log(`✅ 거래처(Supplier) 꽂았습니다: ${sup.name}`);
    }

    for (const usr of sampleUsers) {
      await fetch(`${BASE_URL}/users?documentId=${usr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrapFirestoreData(usr))
      });
      console.log(`✅ 사용자(User) 꽂았습니다: ${usr.name}`);
    }

    for (const cli of sampleClients) {
      await fetch(`${BASE_URL}/clients?documentId=${cli.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrapFirestoreData(cli))
      });
      console.log(`✅ 보건소(Client) 꽂았습니다: ${cli.name}`);
    }

    for (const item of sampleItems) {
      await fetch(`${BASE_URL}/items?documentId=${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrapFirestoreData(item))
      });
      console.log(`✅ 품목(Item) 꽂았습니다: ${item.name}`);
    }

    console.log('🎉 2차 Seeding Complete! 이제 모든 기초 데이터 탭이 꽉 찼습니다!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

seed();
