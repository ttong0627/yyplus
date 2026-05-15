# wssc-unified 프로젝트 설정

## 프로젝트 개요
- **서비스명**: 웰쉐어 통합 시스템
- **URL**: https://wssc-nutrition.web.app
- **Firebase 프로젝트**: wssc-nutrition
- **Firestore 컬렉션**: `wssc_unified` (각 키별 별도 문서, `{ data: [...] }` 형식)

## 기술 스택
- React 18 + Vite 6 + TailwindCSS 4
- Firebase Hosting + Firestore + Auth (익명 로그인)
- 경로: `H:\ttong_project\yyplus\wssc-unified`

## 빌드 & 배포 (wssc-unified 전용)
```
cd H:\ttong_project\yyplus\wssc-unified
npm run build
firebase deploy --only hosting
```
> ⚠️ 다른 프로젝트(wssc-erp-v2, wssc-work-order) 배포 타겟 절대 건드리지 않음

## 핵심 파일 구조
- `src/context/AppContext.jsx` — Firestore 실시간 동기화, 로그인 세션
- `src/components/layout/Sidebar.jsx` — MENUS 배열로 네비게이션 관리
- `src/components/layout/Header.jsx` — PAGE_TITLES 맵으로 페이지명 표시
- `src/components/common/Modal.jsx` — 공통 모달 컴포넌트
- `src/index.css` — 전체 디자인 시스템 (다크 프리미엄 테마)
- `src/utils/index.js` — Utils.fmt, Utils.dlExcel, Utils.hashPw 등

## 디자인 시스템
- 배경: `#06091a` + 인디고 그라디언트
- 카드: `.card` 클래스 (rounded-2xl, 인디고 상단 테두리)
- 버튼: `.btn-primary` (인디고→바이올렛 그라디언트), `.btn-secondary`
- 인풋: `.input-base` (인디고 포커스 글로우)
- 테이블: `.table-base` (인디고 헤더)

## 비밀번호 처리
- SHA-256 해시 저장 (`Utils.hashPw`)
- `hashed: true` 플래그로 구분
- 로그인 시 해시 우선 비교, 평문 폴백 후 자동 마이그레이션

## 역할(Role) 체계
- `admin`: 전체 접근
- `office`: ERP + 일부 물류
- `logistics`: 패키지 + 배송
- `driver`: 배송앱만

## 작업 범위 규칙
- **이 프로젝트만** 작업 (wssc-erp-v2, wssc-work-order는 통합 지시 전까지 손대지 않음)
- 각 프로젝트는 독립적으로 완성 후 형이 직접 통합 예정
