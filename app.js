/* ----------------------------------------------------
   무명 길드 인원 관리 시스템 ver.2 - Application Logic
   ---------------------------------------------------- */

// 애플리케이션 상태 관리
let members = [];
let departedMembers = [];
let blacklist = [];
let sortDirection = 'asc'; // 'asc' 또는 'desc' (정순/역순)

// DOM 요소 캐싱
const elements = {
  // 대시보드 메트릭
  statTotal: document.getElementById('stat-total'),
  statStaff: document.getElementById('stat-staff'),
  statMember: document.getElementById('stat-member'),
  statKakao: document.getElementById('stat-kakao'),
  statNoKakao: document.getElementById('stat-no-kakao'),
  statClan: document.getElementById('stat-clan'),
  statNoClan: document.getElementById('stat-no-clan'),
  statSpecial: document.getElementById('stat-special'),
  statWarning: document.getElementById('stat-warning'),

  // 툴바 및 필터
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  filterRole: document.getElementById('filter-role'),
  filterClan: document.getElementById('filter-clan'),
  filterKakao: document.getElementById('filter-kakao'),
  filterDiscord: document.getElementById('filter-discord'),
  filterWarning: document.getElementById('filter-warning'),
  filterSpecial: document.getElementById('filter-special'),

  // 액션 버튼
  btnAddMember: document.getElementById('btn-add-member'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnImportTrigger: document.getElementById('btn-import-trigger'),
  inputImportFile: document.getElementById('input-import-file'),
  btnKakaoTrigger: document.getElementById('btn-kakao-trigger'),
  inputKakaoFile: document.getElementById('input-kakao-file'),
  btnResetData: document.getElementById('btn-reset-data'),
  currentDateDisplay: document.getElementById('current-date-display'),

  // 테이블 요소
  tableBody: document.getElementById('members-table-body'),
  noDataView: document.getElementById('no-data-view'),
  filteredCount: document.getElementById('filtered-count'),
  totalCount: document.getElementById('total-count'),

  // 모달 요소
  memberModal: document.getElementById('member-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalCloseX: document.getElementById('modal-close-x'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  memberForm: document.getElementById('member-form'),
  
  // 모달 폼 필드
  formId: document.getElementById('member-id-field'),
  formRole: document.getElementById('form-role'),
  formBattleTag: document.getElementById('form-battletag'),
  formKakao: document.getElementById('form-kakao'),
  formPoe2: document.getElementById('form-poe2'),
  formJoinDate: document.getElementById('form-joindate'),
  formChatCount: document.getElementById('form-chatcount'),
  formInClan: document.getElementById('form-inclan'),
  formInKakao: document.getElementById('form-inkakao'),
  formInDiscord: document.getElementById('form-indiscord'),
  formIsSpecial: document.getElementById('form-isspecial'),
  formWarning: document.getElementById('form-warning'),
  formNotes: document.getElementById('form-notes'),

  // 토스트 컨테이너
  toastContainer: document.getElementById('toast-container'),

  // 카톡 대화 분석 모달
  kakaoModal: document.getElementById('kakao-modal'),
  kakaoModalCloseX: document.getElementById('kakao-modal-close-x'),
  kakaoModalCancelBtn: document.getElementById('kakao-modal-cancel-btn'),
  kakaoModalSubmitBtn: document.getElementById('kakao-modal-submit-btn'),
  kakaoPeriodPreset: document.getElementById('kakao-period-preset'),
  kakaoCustomDateFields: document.getElementById('kakao-custom-date-fields'),
  kakaoStartDate: document.getElementById('kakao-start-date'),
  kakaoEndDate: document.getElementById('kakao-end-date')
};

// 비밀번호 인증 암호화 및 잠금 제어 로직
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkAuthorization() {
  const authOverlay = document.getElementById('auth-overlay');
  const authForm = document.getElementById('auth-form');
  const authPassword = document.getElementById('auth-password');
  const authErrorMsg = document.getElementById('auth-error-msg');

  if (!authOverlay || !authForm) return;

  // 이미 인증을 통과한 기기인지 확인
  const isAuth = localStorage.getItem('gms_authorized') === 'true';
  if (isAuth) {
    authOverlay.style.display = 'none';
    authOverlay.classList.remove('active');
    return;
  }

  // 인증 수행
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputPwd = authPassword.value;
    // 비밀번호: mumu1234
    const hashedInput = await sha256(inputPwd);
    const targetHash = '422b01a0de571b2441acfb5ce2f2432cd224f335f124f5f852af9ec093916283';

    if (hashedInput === targetHash) {
      localStorage.setItem('gms_authorized', 'true');
      authOverlay.style.animation = 'fade-out 0.3s forwards';
      authOverlay.addEventListener('animationend', () => {
        authOverlay.style.display = 'none';
        authOverlay.classList.remove('active');
      });
      // 애니메이션 미지원 브라우저 대비 즉시 제거 폴백
      setTimeout(() => {
        authOverlay.style.display = 'none';
        authOverlay.classList.remove('active');
      }, 350);
      showToast('인증되었습니다. 환영합니다!', 'success');
    } else {
      authErrorMsg.style.display = 'block';
      authPassword.value = '';
      authPassword.focus();
    }
  });
}

// 1. 초기 데이터 설정 및 로컬스토리지 로드
function initializeApp() {
  // 보안을 위한 인증 절차 체크
  checkAuthorization();

  // 실시간 오늘 날짜 및 시계 업데이트 설정
  function updateClock() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const seconds = String(today.getSeconds()).padStart(2, '0');
    elements.currentDateDisplay.textContent = `${year}. ${month}. ${day}. ${hours}:${minutes}:${seconds}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 로컬 스토리지 데이터 확인
  const savedData = localStorage.getItem('no_name_clan_members');
  if (savedData) {
    try {
      members = JSON.parse(savedData);
      
      // [자동 번호 부여/복구 핫픽스]
      // 역할이 staff나 member인데 번호(no)가 누락(null/undefined)된 회원이 있으면 자동으로 다음 번호를 매겨 복구합니다.
      let hasFix = false;
      members.forEach(member => {
        if (member.no === null || member.no === undefined) {
          const sameRoleMembers = members.filter(m => m.role === member.role && m.no !== null && m.no !== undefined);
          let nextNo = 1;
          if (sameRoleMembers.length > 0) {
            nextNo = Math.max(...sameRoleMembers.map(m => m.no)) + 1;
          } else if (member.role === 'member') {
            nextNo = 8; // 운영진이 7번까지 있으므로 일반 길드원은 8번부터 시작
          } else if (member.role === 'new') {
            nextNo = 146; // 신입은 146번부터 시작
          }
          member.no = nextNo;
          hasFix = true;
        }
      });
      if (hasFix) {
        saveToLocalStorage();
      }
    } catch (e) {
      console.error('로컬 스토리지 파싱 오류, 초기 데이터로 폴백합니다.', e);
      members = [...initialMembers];
      saveToLocalStorage();
    }
  } else {
    // initialMembers는 initialData.js에서 전역 로드됨
    members = [...initialMembers];
    saveToLocalStorage();
  }

  // 탈퇴자 데이터 확인
  const savedDeparted = localStorage.getItem('no_name_clan_departed');
  if (savedDeparted) {
    try {
      departedMembers = JSON.parse(savedDeparted);
    } catch (e) {
      console.error('탈퇴자 로컬 스토리지 파싱 오류, 초기 데이터로 폴백합니다.', e);
      departedMembers = [...initialDepartedMembers];
      saveDepartedToLocalStorage();
    }
    departedMembers = [...initialDepartedMembers];
    saveDepartedToLocalStorage();
  }

  // 블랙리스트 데이터 확인
  const savedBlacklist = localStorage.getItem('no_name_clan_blacklist');
  if (savedBlacklist) {
    try {
      blacklist = JSON.parse(savedBlacklist);
    } catch (e) {
      console.error('블랙리스트 로컬 스토리지 파싱 오류', e);
      blacklist = [];
    }
  } else {
    blacklist = [];
    localStorage.setItem('no_name_clan_blacklist', JSON.stringify(blacklist));
  }

  // 테마 초기화
  const savedTheme = localStorage.getItem('no_name_clan_theme') || 'lavender';
  setTheme(savedTheme);

  // 모드(라이트/다크) 초기화
  const savedMode = localStorage.getItem('no_name_clan_mode') || 'light';
  setMode(savedMode);

  // 이벤트 리스너 등록
  registerEventListeners();

  // 대시보드 및 테이블 렌더링 (로컬 캐시 우선 로드)
  updateAppView();
  
  // 실시간 클라우드 DB 연결
  initFirebase();
}

// 테마 변경 기능
function setTheme(themeName) {
  // 기존 theme- 클래스 제거
  const themeClasses = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
  themeClasses.forEach(c => document.body.classList.remove(c));
  
  // 테마 클래스 추가
  document.body.classList.add(`theme-${themeName}`);
  
  // 로컬스토리지 저장
  localStorage.setItem('no_name_clan_theme', themeName);
  
  // 버튼 액티브 클래스 갱신
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.theme === themeName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// 모드 변경 기능 (라이트/다크)
function setMode(modeName) {
  document.body.classList.remove('mode-light', 'mode-dark');
  document.body.classList.add(`mode-${modeName}`);
  
  localStorage.setItem('no_name_clan_mode', modeName);
  
  // 아이콘 변경
  const modeIcon = document.getElementById('mode-icon');
  if (modeIcon) {
    modeIcon.textContent = modeName === 'dark' ? '☀️' : '🌙';
  }
}

// 로컬스토리지에 현재 상태 저장
let db;
let unsubscribeGMS = null;
let isFirebaseInitialized = false;

// 파이어베이스 초기화 및 실시간 동기화 바인딩
function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyDIt2Z-5JkGCwkyvmph3bHk2ezMiG4qIEA",
    authDomain: "no-name-clan.firebaseapp.com",
    projectId: "no-name-clan",
    storageBucket: "no-name-clan.firebasestorage.app",
    messagingSenderId: "425211864003",
    appId: "1:425211864003:web:92768a4795f38b01cd5376"
  };

  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseInitialized = true;
    console.log("Firebase가 성공적으로 초기화되었습니다.");

    // Firestore 실시간 리스너 바인딩
    unsubscribeGMS = db.collection('gms_data').doc('state').onSnapshot((doc) => {
      const urlParams = new URLSearchParams(window.location.search);
      const forceReset = urlParams.get('reset') === 'true';

      if (doc.exists && !forceReset) {
        const data = doc.data();
        if (data.members) {
          members = data.members;
          
          // 번호 자동 정렬 및 치유 로직 (번호 누락, 꼬임, 중복, 비는 구간 자동 정정)
          const beforeHash = JSON.stringify(members.map(m => m.no));
          reassignNumbers();
          const afterHash = JSON.stringify(members.map(m => m.no));
          
          if (beforeHash !== afterHash) {
            console.log("실시간 정밀 감지: 번호 정렬 순서가 올바르지 않아 자동으로 번호를 재배열하여 동기화합니다.");
            localStorage.setItem('no_name_clan_members', JSON.stringify(members));
            // 클라우드 서버에 정정된 번호 업로드 (무한 루프 방지를 위해 해시 변경 감지시에만 실행)
            saveToFirebase(members, data.departedMembers || departedMembers);
          } else {
            localStorage.setItem('no_name_clan_members', JSON.stringify(members));
          }
        }
        if (data.departedMembers) {
          departedMembers = data.departedMembers;
          localStorage.setItem('no_name_clan_departed', JSON.stringify(departedMembers));
        }
        if (data.blacklist) {
          blacklist = data.blacklist;
          localStorage.setItem('no_name_clan_blacklist', JSON.stringify(blacklist));
        }
        updateAppView();
        console.log("실시간 데이터 동기화 완료!");
      } else {
        // DB가 비어있거나 강제 리셋이 감지된 경우
        console.log("클라우드 DB 데이터를 초기화 파일 데이터로 강제 리셋합니다.");
        members = [...initialMembers];
        departedMembers = [...initialDepartedMembers];
        blacklist = [];
        
        // 로컬 스토리지에 먼저 덮어쓰고 서버에 업로드
        localStorage.setItem('no_name_clan_members', JSON.stringify(members));
        localStorage.setItem('no_name_clan_departed', JSON.stringify(departedMembers));
        localStorage.setItem('no_name_clan_blacklist', JSON.stringify(blacklist));
        saveToFirebase(members, departedMembers, blacklist);
        
        // 무한 루프 리셋을 방지하기 위해 URL의 ?reset=true 파라미터를 브라우저 주소창에서 깔끔하게 제거
        if (forceReset) {
          const cleanUri = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUri);
          showToast('데이터베이스가 최신 교정된 초기 데이터로 성공적으로 초기화되었습니다!', 'success');
        }
      }
    }, (error) => {
      console.error("Firebase 실시간 동기화 오류 (인증/권한 확인 요망):", error);
      showToast('Firebase 동기화 실패. 콘솔 규칙 설정을 확인해 주세요.', 'danger');
    });
  } catch (e) {
    console.error("Firebase 초기화 중 에러가 발생했습니다.", e);
  }
}

function saveToFirebase(newMembers, newDeparted, newBlacklist) {
  if (!isFirebaseInitialized || !db) return;
  db.collection('gms_data').doc('state').set({
    members: newMembers,
    departedMembers: newDeparted,
    blacklist: newBlacklist || blacklist,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log("클라우드 DB 업로드 완료!");
  }).catch((error) => {
    console.error("클라우드 DB 업로드 실패:", error);
  });
}

// 직책별로 번호를 빈 구멍(빈 번호) 없이 순차적으로 재할당 및 압축
function reassignNumbers() {
  // 1. 운영진 번호 재할당 (1 ~ 7번 대역 유지)
  const staffs = members.filter(m => m.role === 'staff');
  staffs.sort((a, b) => (a.no || 0) - (b.no || 0));
  staffs.forEach((m, idx) => {
    m.no = idx + 1;
  });

  // 2. 일반 회원 번호 재할당 (8번부터 시작)
  const regularMembers = members.filter(m => m.role === 'member');
  regularMembers.sort((a, b) => (a.no || 0) - (b.no || 0));
  regularMembers.forEach((m, idx) => {
    m.no = idx + 8;
  });

  // 3. 신입 회원 번호 재할당 (일반 회원 바로 다음 번호부터 시작)
  const newMembers = members.filter(m => m.role === 'new');
  newMembers.sort((a, b) => (a.no || 0) - (b.no || 0));
  const newStartNo = 8 + regularMembers.length;
  newMembers.forEach((m, idx) => {
    m.no = newStartNo + idx;
  });
}

function saveToLocalStorage() {
  reassignNumbers(); // 저장하기 전에 항상 번호의 빈 구멍을 정렬 및 압축합니다.
  localStorage.setItem('no_name_clan_members', JSON.stringify(members));
  saveToFirebase(members, departedMembers, blacklist);
}

function saveDepartedToLocalStorage() {
  localStorage.setItem('no_name_clan_departed', JSON.stringify(departedMembers));
  saveToFirebase(members, departedMembers, blacklist);
}

function saveBlacklistToLocalStorage() {
  localStorage.setItem('no_name_clan_blacklist', JSON.stringify(blacklist));
  saveToFirebase(members, departedMembers, blacklist);
}

// 2. 대시보드 통계 계산 및 화면 업데이트
function updateAppView() {
  // 1) 통계 계산 (신입 포함 전체 기준 연산)
  const totalCount = members.length;
  const allStaff = members.filter(m => m.role === 'staff');
  const allRegular = members.filter(m => m.role === 'member');
  
  const staffCount = allStaff.length;
  const memberCount = allRegular.length;
  
  // 단톡 참여/미참여
  const kakaoCount = members.filter(m => m.inKakao).length;
  const noKakaoCount = totalCount - kakaoCount;
  
  // 클랜 가입/미가입
  const clanCount = members.filter(m => m.inClan).length;
  const noClanCount = totalCount - clanCount;
  
  // 특별 회원
  const specialCount = members.filter(m => m.isSpecial).length;
  
  // 경고 대상
  const warningCount = members.filter(m => m.warning).length;

  // 2) 대시보드 요소 업데이트
  elements.statTotal.textContent = totalCount;
  elements.statStaff.textContent = staffCount;
  elements.statMember.textContent = memberCount;
  elements.statKakao.textContent = kakaoCount;
  elements.statNoKakao.textContent = noKakaoCount;
  elements.statClan.textContent = clanCount;
  elements.statNoClan.textContent = noClanCount;
  elements.statSpecial.textContent = specialCount;
  elements.statWarning.textContent = warningCount;

  // 전체 데이터 건수 표시
  elements.totalCount.textContent = members.length;

  // 필터 적용 후 테이블 렌더링
  applyFiltersAndRender();

  // 조직도 렌더링
  renderOrgChart();

  // 탈퇴자 명단 렌더링
  renderDepartedMembers();
}

// 3. 필터링 및 검색 로직
function applyFiltersAndRender() {
  const searchQuery = elements.searchInput.value.toLowerCase().trim();
  const roleFilter = elements.filterRole.value;
  const clanFilter = elements.filterClan.value;
  const kakaoFilter = elements.filterKakao.value;
  const discordFilter = elements.filterDiscord.value;
  const warningFilter = elements.filterWarning.value;
  const specialFilter = elements.filterSpecial.value;

  // 검색창 지우기 버튼 표시 여부
  elements.btnClearSearch.style.display = searchQuery ? 'block' : 'none';

  const filtered = members.filter(member => {
    // 1) 텍스트 검색 (배틀태그, 카톡명, POE2 아이디)
    const matchesSearch = !searchQuery || 
      (member.battleTag && member.battleTag.toLowerCase().includes(searchQuery)) ||
      (member.kakaoProfile && member.kakaoProfile.toLowerCase().includes(searchQuery)) ||
      (member.poe2Account && member.poe2Account.toLowerCase().includes(searchQuery)) ||
      (member.notes && member.notes.toLowerCase().includes(searchQuery));

    // 2) 직책 필터
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;

    // 3) 클랜 필터
    const matchesClan = clanFilter === 'all' || 
      (clanFilter === 'true' && member.inClan) || 
      (clanFilter === 'false' && !member.inClan);

    // 4) 카톡 필터
    const matchesKakao = kakaoFilter === 'all' || 
      (kakaoFilter === 'true' && member.inKakao) || 
      (kakaoFilter === 'false' && !member.inKakao);

    // 5) 디코 필터
    const matchesDiscord = discordFilter === 'all' || 
      (discordFilter === 'true' && member.inDiscord) || 
      (discordFilter === 'false' && !member.inDiscord);

    // 6) 경고 필터
    const matchesWarning = warningFilter === 'all' || 
      (warningFilter === 'true' && member.warning) || 
      (warningFilter === 'false' && !member.warning);

    // 7) 특별 필터
    const matchesSpecial = specialFilter === 'all' || 
      (specialFilter === 'true' && member.isSpecial) || 
      (specialFilter === 'false' && !member.isSpecial);

    return matchesSearch && matchesRole && matchesClan && matchesKakao && matchesDiscord && matchesWarning && matchesSpecial;
  });

  // 테이블 본문 그리기
  renderTable(filtered);
}

// 4. 테이블 렌더링
function renderTable(filteredList) {
  elements.filteredCount.textContent = filteredList.length;

  if (filteredList.length === 0) {
    elements.tableBody.innerHTML = '';
    elements.noDataView.style.display = 'flex';
    return;
  }

  elements.noDataView.style.display = 'none';

  // 정렬 순서: 기본(오름차순)은 운영진 -> 일반 -> 신입 순서 (번호 오름차순)
  // 역순(내림차순)은 신입 -> 일반 -> 운영진 순서 (번호 내림차순)
  const sortedList = [...filteredList].sort((a, b) => {
    const roleOrder = { 'staff': 1, 'member': 2, 'new': 3 };
    let comparison = 0;
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      comparison = roleOrder[a.role] - roleOrder[b.role];
    } else {
      const aNo = a.no || 99999;
      const bNo = b.no || 99999;
      comparison = aNo - bNo;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  let html = '';
  sortedList.forEach(member => {
    // 번호 표시 (신입인 경우 '-' 표시)
    const noDisplay = member.no !== null && member.no !== undefined ? member.no : '-';

    // 직책 배지
    let roleBadge = '';
    if (member.role === 'staff') {
      roleBadge = '<span class="badge-role staff">운영진</span>';
    } else if (member.role === 'member') {
      roleBadge = '<span class="badge-role member">일반</span>';
    } else {
      roleBadge = '<span class="badge-role new">신입</span>';
    }

    // 상태 토글용 체크박스 클래스
    const clanClass = member.inClan ? 'true' : 'false';
    const clanIcon = member.inClan ? '✔' : '✘';
    
    const kakaoClass = member.inKakao ? 'true' : 'false';
    const kakaoIcon = member.inKakao ? '✔' : '✘';
    
    const discordClass = member.inDiscord ? 'true' : 'false';
    const discordIcon = member.inDiscord ? '✔' : '✘';
    
    const specialClass = member.isSpecial ? 'true' : 'false';
    const specialIcon = member.isSpecial ? '★' : '☆';
    
    const warningClass = member.warning ? 'true' : 'false';
    const warningIcon = member.warning ? '⚠️' : '정상';

    html += `
      <tr data-id="${member.id}">
        <td>${noDisplay}</td>
        <td>${roleBadge}</td>
        <td class="font-semibold">${escapeHTML(member.battleTag)}</td>
        <td>${escapeHTML(member.kakaoProfile)}</td>
        <td>${escapeHTML(member.poe2Account || '')}</td>
        <td class="text-secondary">${escapeHTML(member.joinDate || '')}</td>
        <td style="text-align: right;" class="font-semibold">${member.chatCount || 0}</td>
        <td style="text-align: center;">
          <span class="status-indicator ${clanClass}" onclick="toggleStatus('${member.id}', 'inClan')">${clanIcon}</span>
        </td>
        <td style="text-align: center;">
          <span class="status-indicator ${kakaoClass}" onclick="toggleStatus('${member.id}', 'inKakao')">${kakaoIcon}</span>
        </td>
        <td style="text-align: center;">
          <span class="status-indicator ${discordClass}" onclick="toggleStatus('${member.id}', 'inDiscord')">${discordIcon}</span>
        </td>
        <td style="text-align: center;">
          <span class="status-indicator special-indicator ${specialClass}" onclick="toggleStatus('${member.id}', 'isSpecial')">${specialIcon}</span>
        </td>
        <td style="text-align: center;">
          <span class="status-indicator warning-indicator ${warningClass}" onclick="toggleStatus('${member.id}', 'warning')">${warningIcon}</span>
        </td>
        <td class="text-muted" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(member.notes || '')}">
          ${escapeHTML(member.notes || '')}
        </td>
        <td>
          <div class="row-actions">
            <button class="btn-icon edit-btn" onclick="openEditModal('${member.id}')" title="수정">✏️</button>
            <button class="btn-icon delete-btn" onclick="deleteMember('${member.id}')" title="삭제">🗑️</button>
            <button class="btn-icon blacklist-btn" onclick="blacklistMember('${member.id}', 'members')" title="블랙리스트 등록" style="background: none; border: none; cursor: pointer; filter: grayscale(1); transition: filter 0.2s;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='grayscale(1)'">🚫</button>
          </div>
        </td>
      </tr>
    `;
  });

  elements.tableBody.innerHTML = html;
}

// 5. 인라인 상태 토글 기능 (스프레드시트 같은 사용성)
window.toggleStatus = function(id, field) {
  const index = members.findIndex(m => m.id === id);
  if (index !== -1) {
    members[index][field] = !members[index][field];
    
    // 만약 특별 회원을 설정하면 자동으로 일반회원으로 역할을 부여하거나 디코에 설정하게 조정 가능
    if (field === 'isSpecial' && members[index].isSpecial) {
      members[index].inDiscord = true; // 특별회원은 자동으로 디코 등록처리
    }

    saveToLocalStorage();
    updateAppView();
    showToast(`${members[index].battleTag}님의 정보가 변경되었습니다.`, 'info');
  }
};

// 6. 길드원 추가 및 수정 모달 기능
function openAddModal() {
  elements.modalTitle.textContent = '길드원 추가';
  elements.formId.value = '';
  elements.memberForm.reset();
  
  // 기본 날짜는 오늘로 입력 유도
  const today = new Date();
  const yStr = String(today.getFullYear()).substring(2);
  const mStr = String(today.getMonth() + 1).padStart(2, '0');
  const dStr = String(today.getDate()).padStart(2, '0');
  elements.formJoinDate.value = `${yStr}. ${mStr}. ${dStr}`;
  
  // 기본 체크박스 상태 설정
  elements.formInClan.checked = true;
  elements.formInKakao.checked = true;
  elements.formInDiscord.checked = false;
  elements.formIsSpecial.checked = false;
  elements.formWarning.checked = false;

  openModal();
}

window.openEditModal = function(id) {
  const member = members.find(m => m.id === id);
  if (!member) return;

  elements.modalTitle.textContent = '길드원 정보 수정';
  elements.formId.value = member.id;
  elements.formRole.value = member.role;
  elements.formBattleTag.value = member.battleTag;
  elements.formKakao.value = member.kakaoProfile;
  elements.formPoe2.value = member.poe2Account || '';
  elements.formJoinDate.value = member.joinDate || '';
  elements.formChatCount.value = member.chatCount || 0;
  
  elements.formInClan.checked = !!member.inClan;
  elements.formInKakao.checked = !!member.inKakao;
  elements.formInDiscord.checked = !!member.inDiscord;
  elements.formIsSpecial.checked = !!member.isSpecial;
  elements.formWarning.checked = !!member.warning;
  elements.formNotes.value = member.notes || '';

  openModal();
};

function openModal() {
  elements.memberModal.classList.add('active');
  elements.memberModal.setAttribute('aria-hidden', 'false');
  elements.formBattleTag.focus();
}

function closeModal() {
  elements.memberModal.classList.remove('active');
  elements.memberModal.setAttribute('aria-hidden', 'true');
}

// 멤버 등록 및 변경 처리
function handleFormSubmit(e) {
  e.preventDefault();

  const id = elements.formId.value;
  const role = elements.formRole.value;
  const battleTag = elements.formBattleTag.value.trim();
  const kakaoProfile = elements.formKakao.value.trim();
  const poe2Account = elements.formPoe2.value.trim();
  const joinDate = elements.formJoinDate.value.trim();
  const chatCount = parseInt(elements.formChatCount.value) || 0;
  
  const inClan = elements.formInClan.checked;
  const inKakao = elements.formInKakao.checked;
  const inDiscord = elements.formInDiscord.checked;
  const isSpecial = elements.formIsSpecial.checked;
  const warning = elements.formWarning.checked;
  const notes = elements.formNotes.value.trim();

  // 유효성 검증
  if (!battleTag || !kakaoProfile) {
    showToast('배틀태그와 카톡 프로필은 필수 입력 사항입니다.', 'danger');
    return;
  }

  if (id) {
    // 1) 수정 작업
    const idx = members.findIndex(m => m.id === id);
    if (idx !== -1) {
      let memberNo = members[idx].no;
      // 직책(역할)이 바뀌었거나 번호가 빈 경우 알맞은 범위의 번호 부여
      if (role !== members[idx].role || memberNo === null || memberNo === undefined) {
        const sameRoleMembers = members.filter(m => m.role === role && m.no !== null && m.no !== undefined);
        let nextNo = 1;
        if (sameRoleMembers.length > 0) {
          nextNo = Math.max(...sameRoleMembers.map(m => m.no)) + 1;
        } else if (role === 'member') {
          nextNo = 8;
        } else if (role === 'new') {
          nextNo = 146;
        }
        memberNo = nextNo;
      }

      members[idx] = {
        ...members[idx],
        role,
        no: memberNo,
        battleTag,
        kakaoProfile,
        poe2Account,
        joinDate,
        chatCount,
        inClan,
        inKakao,
        inDiscord,
        isSpecial,
        warning,
        notes
      };
      showToast(`${battleTag}님의 정보가 수정되었습니다.`, 'success');
    }
  } else {
    // 2) 신규 추가 작업
    // 새 멤버의 NO 지정 (기존 직책 내 최대 번호 + 1)
    const sameRoleMembers = members.filter(m => m.role === role && m.no !== null);
    let nextNo = 1;
    if (sameRoleMembers.length > 0) {
      nextNo = Math.max(...sameRoleMembers.map(m => m.no)) + 1;
    } else if (role === 'member') {
      nextNo = 8; // 운영진이 7번까지 있으므로 일반 길드원은 8번부터 시작
    } else if (role === 'new') {
      nextNo = 146; // 신입은 146번부터 시작
    }

    const newId = role + '_' + Date.now();
    members.push({
      id: newId,
      no: nextNo, // 신입도 이제 번호가 부여됨
      role,
      battleTag,
      kakaoProfile,
      poe2Account,
      joinDate,
      chatCount,
      inClan,
      inKakao,
      inDiscord,
      isSpecial,
      warning,
      notes
    });
    showToast(`${battleTag}님이 추가되었습니다.`, 'success');
  }

  saveToLocalStorage();
  updateAppView();
  closeModal();
}

// 7. 길드원 삭제 및 탈퇴자 이동
window.deleteMember = function(id) {
  const member = members.find(m => m.id === id);
  if (!member) return;

  if (confirm(`'${member.battleTag}'님을 탈퇴 처리하여 [탈퇴자 명단]으로 이동하시겠습니까?\n\n(확인: 탈퇴자 명단으로 이동, 취소: 영구 삭제 선택)`)) {
    const reason = prompt('탈퇴 사유를 입력해 주세요 (생략 가능):', '');
    if (reason === null) return; // 사용자가 프롬프트를 취소한 경우

    // 탈퇴자 리스트용 데이터 구조 생성
    const d = new Date();
    const leaveDate = `${String(d.getFullYear()).slice(2)}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;

    const departedItem = {
      ...member,
      id: "departed_" + member.battleTag,
      leaveDate: leaveDate,
      notes: reason.trim() || "자진 탈퇴"
    };

    // 탈퇴자 추가 및 기존 명단에서 삭제
    departedMembers.unshift(departedItem);
    members = members.filter(m => m.id !== id);

    saveToLocalStorage();
    saveDepartedToLocalStorage();
    updateAppView();
    showToast(`'${member.battleTag}'님이 탈퇴자 명단으로 이동되었습니다.`, 'success');
  } else {
    // 영구 삭제 단계
    if (confirm(`'${member.battleTag}'님을 정말로 명단에서 영구 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.`)) {
      members = members.filter(m => m.id !== id);
      saveToLocalStorage();
      updateAppView();
      showToast(`'${member.battleTag}'님이 영구 삭제되었습니다.`, 'danger');
    }
  }
};

// 8. 백업 데이터 내보내기 및 백업 복원 기능
function exportJSON() {
  const exportData = {
    members: members,
    departedMembers: departedMembers,
    blacklist: blacklist
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `no_name_guild_backup_${getFormattedDate()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('JSON 백업 파일이 다운로드되었습니다.', 'success');
}

function exportCSV() {
  // UTF-8 BOM 필수 (\uFEFF) -> 엑셀 한글 깨짐 방지
  let csvContent = "\uFEFF";
  
  // CSV 헤더 작성
  const headers = ["구분", "번호", "배틀태그", "카톡 프로필", "POE2 계정", "가입일", "단톡횟수", "클랜가입여부", "카톡참여여부", "디코참여여부", "특별회원여부", "경고여부", "비고"];
  csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

  // CSV 데이터 행 작성
  members.forEach(m => {
    const roleKor = m.role === 'staff' ? '운영진' : m.role === 'member' ? '일반' : '신입';
    const noVal = m.no !== null ? m.no : '';
    const row = [
      roleKor,
      noVal,
      m.battleTag,
      m.kakaoProfile,
      m.poe2Account || '',
      m.joinDate || '',
      m.chatCount || 0,
      m.inClan ? 'TRUE' : 'FALSE',
      m.inKakao ? 'TRUE' : 'FALSE',
      m.inDiscord ? 'TRUE' : 'FALSE',
      m.isSpecial ? 'TRUE' : 'FALSE',
      m.warning ? 'TRUE' : 'FALSE',
      m.notes || ''
    ];
    csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", url);
  downloadAnchor.setAttribute("download", `no_name_guild_members_${getFormattedDate()}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('엑셀용 CSV 파일이 다운로드되었습니다.', 'success');
}

// 백업 파일 선택 이벤트 트리거
function triggerImport() {
  elements.inputImportFile.click();
}

// 백업 파일 로드 및 검증
function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      
      let valid = false;
      let targetMembers = [];
      let targetDeparted = [];
      let targetBlacklist = [];
      
      if (Array.isArray(importedData)) {
        // 구버전 백업 형식 (직접 배열)
        if (importedData.length > 0 && importedData[0].hasOwnProperty('battleTag')) {
          valid = true;
          targetMembers = importedData;
        }
      } else if (importedData && typeof importedData === 'object') {
        // 신버전 백업 형식 (객체)
        if (importedData.members && Array.isArray(importedData.members)) {
          valid = true;
          targetMembers = importedData.members;
          targetDeparted = importedData.departedMembers || [];
          targetBlacklist = importedData.blacklist || [];
        }
      }

      if (valid) {
        if (confirm(`가져온 파일에서 데이터를 복원하시겠습니까? 기존 데이터는 덮어씌워집니다.`)) {
          members = targetMembers;
          departedMembers = targetDeparted;
          blacklist = targetBlacklist;
          
          saveToLocalStorage();
          saveDepartedToLocalStorage();
          saveBlacklistToLocalStorage();
          
          updateAppView();
          showToast('백업 파일로부터 데이터를 성공적으로 복원했습니다.', 'success');
        }
      } else {
        showToast('유효하지 않은 백업 파일 형식입니다.', 'danger');
      }
    } catch (err) {
      showToast('파일을 파싱하는 중 오류가 발생했습니다.', 'danger');
      console.error(err);
    }
  };
  reader.readAsText(file);
  // 동일 파일 선택 시 다시 이벤트 발생할 수 있도록 비움
  e.target.value = '';
}

// 데이터 초기화
function resetToInitial() {
  if (confirm('정말로 데이터를 초기 데이터 상태로 돌리시겠습니까? 추가 및 수정된 모든 데이터가 손실됩니다.')) {
    localStorage.removeItem('no_name_clan_members');
    members = [...initialMembers];
    saveToLocalStorage();
    updateAppView();
    showToast('길드원 데이터가 처음 상태로 리셋되었습니다.', 'warning');
  }
}

// 카톡 대화 로그 선택 트리거 -> 모달 열기
function triggerKakaoImport() {
  elements.kakaoModal.classList.add('active');
  elements.kakaoModal.setAttribute('aria-hidden', 'false');
}

// 카톡 분석 모달 닫기
function closeKakaoModal() {
  elements.kakaoModal.classList.remove('active');
  elements.kakaoModal.setAttribute('aria-hidden', 'true');
}

// 카톡 대화 로그 파일 파싱 및 갱신
function handleKakaoFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const text = event.target.result;
    const lines = text.split(/\r?\n/);
    
    // 카톡 닉네임별 메시지 수 집계
    const nameCounts = {};
    
    // PC 카톡 포맷: [홍길동] [오전 10:00] 메시지
    const pcRegex = /^\[([^\]]+)\]\s+\[(?:오전|오후)\s+\d{1,2}:\d{2}\]/;
    
    // 모바일 카톡 포맷 1 (Android/iOS 한글): 2026년 7월 2일 오후 9:30, 홍길동 : 메시지 또는 2026. 7. 2. 오후 9:30, 홍길동 : 메시지 (쉼표, 콜론 모두 허용)
    const mobileKoRegex = /^\d{4}[\.년]\s*\d{1,2}[\.월]\s*\d{1,2}[\.일]?(?:\s*\w+요일)?\s+(?:오전|오후)\s+\d{1,2}:\d{2}[,:]\s*([^:]+)\s*:/;
    
    // 모바일 카톡 포맷 2 (대시/타임스탬프): 2026-07-02 21:30:10, 홍길동 : 메시지 (쉼표, 콜론 모두 허용)
    const mobileDbRegex = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?[,:]\s*([^:]+)\s*:/;
    
    // 모바일 카톡 포맷 3 (시간만): 오전/오후 10:00, 홍길동 : 메시지 (쉼표, 콜론 모두 허용)
    const mobileTimeRegex = /^(?:오전|오후)\s+\d{1,2}:\d{2}[,:]\s*([^:]+)\s*:/;
    
    // 맥/아이패드 카톡 포맷 4: 2026. 7. 2. 21:30, 홍길동 : 메시지 또는 2026. 7. 2. 21:30: 홍길동: 메시지
    const macRegex = /^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{1,2}:\d{2}(?::\d{2})?,?\s*([^:]+)\s*[:]/;

    // 날짜 헤더 정규식
    const pcHeaderRegex = /^-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
    const mobileHeaderRegex = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
    const dotHeaderRegex = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./;
    const mobileInlineDateRegex = /^(\d{4})-(\d{2})-(\d{2})\s+\d{2}:\d{2}:\d{2}/;

    // 분석할 기간 설정 가져오기
    const preset = elements.kakaoPeriodPreset.value;
    let startDate = null;
    let endDate = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === '7days') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === '30days') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === 'custom') {
      if (elements.kakaoStartDate.value) {
        startDate = new Date(elements.kakaoStartDate.value);
        startDate.setHours(0, 0, 0, 0);
      }
      if (elements.kakaoEndDate.value) {
        endDate = new Date(elements.kakaoEndDate.value);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    let pcMatchCount = 0;
    let mobileMatchCount = 0;
    let currentParsedDate = null;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // 1. 날짜 구분선/헤더 분석
      let dateHeaderMatch;
      if ((dateHeaderMatch = trimmedLine.match(pcHeaderRegex))) {
        currentParsedDate = new Date(parseInt(dateHeaderMatch[1]), parseInt(dateHeaderMatch[2]) - 1, parseInt(dateHeaderMatch[3]));
      } else if ((dateHeaderMatch = trimmedLine.match(mobileHeaderRegex))) {
        currentParsedDate = new Date(parseInt(dateHeaderMatch[1]), parseInt(dateHeaderMatch[2]) - 1, parseInt(dateHeaderMatch[3]));
      } else if ((dateHeaderMatch = trimmedLine.match(dotHeaderRegex))) {
        currentParsedDate = new Date(parseInt(dateHeaderMatch[1]), parseInt(dateHeaderMatch[2]) - 1, parseInt(dateHeaderMatch[3]));
      }

      // 2. 모바일 인라인 날짜 분석
      let inlineDateMatch = trimmedLine.match(mobileInlineDateRegex);
      let lineDate = currentParsedDate;
      if (inlineDateMatch) {
        lineDate = new Date(parseInt(inlineDateMatch[1]), parseInt(inlineDateMatch[2]) - 1, parseInt(inlineDateMatch[3]));
        currentParsedDate = lineDate;
      }

      // 3. 메시지 송신자 분석
      let sender = null;
      let match;
      
      if ((match = trimmedLine.match(pcRegex))) {
        sender = match[1];
        pcMatchCount++;
      } else if ((match = trimmedLine.match(mobileKoRegex))) {
        sender = match[1];
        mobileMatchCount++;
      } else if ((match = trimmedLine.match(mobileDbRegex))) {
        sender = match[1];
        mobileMatchCount++;
      } else if ((match = trimmedLine.match(mobileTimeRegex))) {
        sender = match[1];
        mobileMatchCount++;
      } else if ((match = trimmedLine.match(macRegex))) {
        sender = match[1];
        mobileMatchCount++;
      }
      
      if (sender) {
        sender = sender.trim();
        // 날짜 필터링 체크
        let dateOk = true;
        if (lineDate) {
          if (startDate && lineDate < startDate) dateOk = false;
          if (endDate && lineDate > endDate) dateOk = false;
        }
        
        if (dateOk) {
          nameCounts[sender] = (nameCounts[sender] || 0) + 1;
        }
      }
    });

    const totalParsedLines = pcMatchCount + mobileMatchCount;
    if (totalParsedLines === 0) {
      showToast('분석 가능한 카카오톡 대화 형식을 찾지 못했습니다. 내보낸 텍스트(.txt) 파일이 맞는지 확인해 주세요.', 'danger');
      e.target.value = '';
      return;
    }

    // 길드원 명단과 카톡 이름 매칭 및 단톡 횟수 업데이트
    let membersUpdated = 0;
    const matchDetails = [];
    const matchedKeys = new Set();

    members.forEach(member => {
      // 카톡 프로필명을 분석하여 실명/닉네임 추출
      const profile = member.kakaoProfile.toLowerCase().trim();
      const parts = profile.split(/[\/\s]+/).map(p => p.trim()).filter(Boolean);
      const btPrefix = member.battleTag.split('#')[0].toLowerCase().trim();
      
      let count = 0;
      let matchedKey = null;

      for (const key in nameCounts) {
        const cleanKey = key.toLowerCase().trim();
        const keyParts = cleanKey.split(/[\/\s\(\)\[\]#]+/).map(k => k.trim()).filter(Boolean);

        let isMatch = false;

        // 1) 완전 일치
        if (cleanKey === profile) {
          isMatch = true;
        }
        
        // 2) 배틀태그 앞부분이 카톡 이름에 들어가거나 일치하는 경우
        if (!isMatch && btPrefix && btPrefix.length >= 2) {
          if (cleanKey.includes(btPrefix) || keyParts.includes(btPrefix)) {
            isMatch = true;
          }
        }

        // 3) 길드원 프로필에 등록된 분할 키워드가 카톡 이름에 포함되는 경우 (예: '츄니'가 '츄니/배틀태그'에 포함)
        if (!isMatch) {
          for (const p of parts) {
            if (p.length >= 2) {
              if (cleanKey.includes(p) || keyParts.includes(p)) {
                isMatch = true;
                break;
              }
            }
          }
        }

        // 4) 카톡 이름에 들어있는 분할 단어가 길드원 프로필/이름에 포함되는 경우 (예: '츄니/배틀태그'의 '츄니'가 프로필에 포함)
        if (!isMatch) {
          for (const kp of keyParts) {
            if (kp.length >= 2) {
              if (profile.includes(kp) || parts.includes(kp)) {
                isMatch = true;
                break;
              }
            }
          }
        }

        // 5) POE2 계정명이 카톡 이름에 포함되거나 일치하는 경우
        if (!isMatch && member.poe2Account) {
          const poeClean = member.poe2Account.toLowerCase().trim();
          if (poeClean.length >= 3) {
            if (cleanKey.includes(poeClean) || keyParts.includes(poeClean)) {
              isMatch = true;
            }
          }
        }

        if (isMatch) {
          count += nameCounts[key];
          matchedKey = key;
        }
      }

      if (count > 0) {
        member.chatCount = count;
        membersUpdated++;
        matchDetails.push(`${member.battleTag} (${matchedKey} -> ${count}회)`);
        matchedKeys.add(matchedKey);
      } else {
        member.chatCount = 0;
      }
    });

    // 2. 탈퇴자 명단도 매칭하여 단톡 횟수 업데이트
    let departedUpdated = 0;
    departedMembers.forEach(member => {
      // 카톡 프로필명을 분석하여 실명/닉네임 추출
      const profile = member.kakaoProfile.toLowerCase().trim();
      const parts = profile.split(/[\/\s]+/).map(p => p.trim()).filter(Boolean);
      const btPrefix = member.battleTag.split('#')[0].toLowerCase().trim();
      
      let count = 0;
      let matchedKey = null;

      for (const key in nameCounts) {
        const cleanKey = key.toLowerCase().trim();
        const keyParts = cleanKey.split(/[\/\s\(\)\[\]#]+/).map(k => k.trim()).filter(Boolean);

        let isMatch = false;

        // 1) 완전 일치
        if (cleanKey === profile) {
          isMatch = true;
        }
        
        // 2) 배틀태그 앞부분이 카톡 이름에 들어가거나 일치하는 경우
        if (!isMatch && btPrefix && btPrefix.length >= 2) {
          if (cleanKey.includes(btPrefix) || keyParts.includes(btPrefix)) {
            isMatch = true;
          }
        }

        // 3) 길드원 프로필에 등록된 분할 키워드가 카톡 이름에 포함되는 경우
        if (!isMatch) {
          for (const p of parts) {
            if (p.length >= 2) {
              if (cleanKey.includes(p) || keyParts.includes(p)) {
                isMatch = true;
                break;
              }
            }
          }
        }

        // 4) 카톡 이름에 들어있는 분할 단어가 길드원 프로필/이름에 포함되는 경우
        if (!isMatch) {
          for (const kp of keyParts) {
            if (kp.length >= 2) {
              if (profile.includes(kp) || parts.includes(kp)) {
                isMatch = true;
                break;
              }
            }
          }
        }

        // 5) POE2 계정명이 카톡 이름에 포함되거나 일치하는 경우
        if (!isMatch && member.poe2Account) {
          const poeClean = member.poe2Account.toLowerCase().trim();
          if (poeClean.length >= 3) {
            if (cleanKey.includes(poeClean) || keyParts.includes(poeClean)) {
              isMatch = true;
            }
          }
        }

        if (isMatch) {
          count += nameCounts[key];
          matchedKey = key;
        }
      }

      if (count > 0) {
        member.chatCount = count;
        departedUpdated++;
        matchDetails.push(`[탈퇴자] ${member.battleTag} (${matchedKey} -> ${count}회)`);
        matchedKeys.add(matchedKey);
      } else {
        member.chatCount = 0;
      }
    });

    let periodText = '전체 기간';
    if (startDate || endDate) {
      const startStr = startDate ? `${startDate.getFullYear()}.${String(startDate.getMonth()+1).padStart(2,'0')}.${String(startDate.getDate()).padStart(2,'0')}` : '시작일 미지정';
      const endStr = endDate ? `${endDate.getFullYear()}.${String(endDate.getMonth()+1).padStart(2,'0')}.${String(endDate.getDate()).padStart(2,'0')}` : '종료일 미지정';
      periodText = `${startStr} ~ ${endStr}`;
    }

    const totalUpdated = membersUpdated + departedUpdated;

    if (totalUpdated > 0) {
      if (confirm(`[분석 기간: ${periodText}]\n\n총 ${totalParsedLines}개의 대화 중 길드원 ${membersUpdated}명, 탈퇴자 ${departedUpdated}명을 매칭했습니다. 단톡 횟수를 갱신하시겠습니까?`)) {
        saveToLocalStorage();
        saveDepartedToLocalStorage();
        updateAppView();
        showToast(`카톡 분석 완료 (${periodText}): 총 ${totalUpdated}명(길드원 ${membersUpdated}명, 탈퇴자 ${departedUpdated}명)의 단톡 횟수가 갱신되었습니다!`, 'success');
        console.log("매칭 상세 결과:", matchDetails);
      }
    } else {
      alert('가져온 대화 기록에서 매칭되는 길드원을 찾지 못했습니다. 카톡 프로필명을 확인해 주세요.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// 9. 유틸리티 함수들
function getFormattedDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHTML(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  elements.toastContainer.appendChild(toast);
  
  // 3.5초 뒤 자동 제거
  setTimeout(() => {
    toast.style.animation = 'slide-out 0.3s forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3500);
}

// 10. 이벤트 리스너 통합 관리
function registerEventListeners() {
  // 검색 및 필터 변경 시 (150ms 디바운스 적용하여 쾌적한 타이핑 제공)
  elements.searchInput.addEventListener('input', debounce(applyFiltersAndRender, 150));
  elements.btnClearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    applyFiltersAndRender();
    elements.searchInput.focus();
  });

  [
    elements.filterRole,
    elements.filterClan,
    elements.filterKakao,
    elements.filterDiscord,
    elements.filterWarning,
    elements.filterSpecial
  ].forEach(select => select.addEventListener('change', applyFiltersAndRender));

  // 추가 단추 및 모달 닫기
  elements.btnAddMember.addEventListener('click', openAddModal);
  elements.modalCloseX.addEventListener('click', closeModal);
  elements.modalCancelBtn.addEventListener('click', closeModal);
  elements.memberModal.addEventListener('click', (e) => {
    if (e.target === elements.memberModal) closeModal();
  });

  // 폼 등록 시
  elements.memberForm.addEventListener('submit', handleFormSubmit);

  // 백업 및 유틸리티 단추
  elements.btnExportJson.addEventListener('click', (e) => { e.preventDefault(); exportJSON(); });
  elements.btnExportCsv.addEventListener('click', (e) => { e.preventDefault(); exportCSV(); });
  elements.btnImportTrigger.addEventListener('click', triggerImport);
  elements.inputImportFile.addEventListener('change', handleImportFile);
  elements.btnKakaoTrigger.addEventListener('click', triggerKakaoImport);
  elements.inputKakaoFile.addEventListener('change', handleKakaoFile);
  if (elements.btnResetData) {
    elements.btnResetData.addEventListener('click', resetToInitial);
  }

  // 역할 선택에 따라 '특별 회원' 체크박스 가시성 조절
  elements.formRole.addEventListener('change', (e) => {
    const wrap = document.getElementById('special-member-checkbox-wrap');
    if (e.target.value === 'new') {
      wrap.style.display = 'none';
      elements.formIsSpecial.checked = false;
    } else {
      wrap.style.display = 'flex';
    }
  });

  // 테마 변경 버튼 이벤트 등록
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeName = e.target.dataset.theme;
      setTheme(themeName);
      
      const themeKor = {
        'lavender': '파스텔 라벤더',
        'mint': '파스텔 민트',
        'peach': '파스텔 피치',
        'sky': '파스텔 스카이'
      }[themeName];
      showToast(`${themeKor} 테마가 적용되었습니다.`, 'success');
    });
  });

  // 다크/라이트 모드 전환 토글
  const btnModeToggle = document.getElementById('btn-mode-toggle');
  if (btnModeToggle) {
    btnModeToggle.addEventListener('click', () => {
      const currentMode = document.body.classList.contains('mode-dark') ? 'dark' : 'light';
      const nextMode = currentMode === 'dark' ? 'light' : 'dark';
      setMode(nextMode);
      
      const modeKor = nextMode === 'dark' ? '다크 모드' : '라이트 모드';
      showToast(`${modeKor}가 적용되었습니다.`, 'success');
    });
  }

  // 탭 변경 이벤트 바인딩
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });

  // 탈퇴자 검색 바인딩
  const searchInputDeparted = document.getElementById('search-input-departed');
  if (searchInputDeparted) {
    searchInputDeparted.addEventListener('input', renderDepartedMembers);
  }

  // 블랙리스트 검색 바인딩
  const searchInputBlacklist = document.getElementById('search-input-blacklist');
  if (searchInputBlacklist) {
    searchInputBlacklist.addEventListener('input', renderBlacklist);
  }

  // 블랙리스트 수동 추가 버튼 바인딩
  const btnAddBlacklist = document.getElementById('btn-add-blacklist');
  if (btnAddBlacklist) {
    btnAddBlacklist.addEventListener('click', addInlineBlacklistRow);
  }

  // 카톡 분석 모달 이벤트 바인딩
  if (elements.kakaoModalCloseX) {
    elements.kakaoModalCloseX.addEventListener('click', closeKakaoModal);
  }
  if (elements.kakaoModalCancelBtn) {
    elements.kakaoModalCancelBtn.addEventListener('click', closeKakaoModal);
  }
  if (elements.kakaoModal) {
    elements.kakaoModal.addEventListener('click', (e) => {
      if (e.target === elements.kakaoModal) closeKakaoModal();
    });
  }

  // 기간 셀렉트박스 변경 시 사용자 지정 날짜 필드 활성화/비활성화
  if (elements.kakaoPeriodPreset) {
    elements.kakaoPeriodPreset.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        elements.kakaoCustomDateFields.style.display = 'grid';
      } else {
        elements.kakaoCustomDateFields.style.display = 'none';
      }
    });
  }

  // 카톡 분석 모달 내 파일 분석 시작 클릭 시
  if (elements.kakaoModalSubmitBtn) {
    elements.kakaoModalSubmitBtn.addEventListener('click', () => {
      if (elements.kakaoPeriodPreset.value === 'custom') {
        if (!elements.kakaoStartDate.value && !elements.kakaoEndDate.value) {
          alert('시작일 또는 종료일 중 최소 하나는 입력해야 합니다.');
          return;
        }
      }
      closeKakaoModal();
      elements.inputKakaoFile.click();
    });
  }
}

// 탭 전환 기능
function switchTab(tabName) {
  // 모든 탭 버튼 active 클래스 해제
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 모든 탭 콘텐츠 active 클래스 해제
  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === `tab-content-${tabName}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // 조직도, 탈퇴자 또는 블랙리스트 탭으로 전환되었을 때 화면 즉시 갱신
  if (tabName === 'organization') {
    renderOrgChart();
  } else if (tabName === 'departed') {
    renderDepartedMembers();
  } else if (tabName === 'blacklist') {
    renderBlacklist();
  }
}

// 길드 조직도 렌더링
function renderOrgChart() {
  const wrapper = document.getElementById('org-tree-wrapper');
  if (!wrapper) return;
  
  // Find staff members
  const staffMembers = members.filter(m => m.role === 'staff');
  const leader = staffMembers.find(m => m.notes.includes('클랜장')) || staffMembers.find(m => m.notes.includes('길드마스터')) || staffMembers[0];
  const viceLeader = staffMembers.find(m => m.notes.includes('부클랜장')) || staffMembers.find(m => m.notes.includes('부길드마스터'));
  const officers = staffMembers.filter(m => m.id !== (leader ? leader.id : '') && (!viceLeader || m.id !== viceLeader.id));
  
  let html = '';
  
  if (!leader) {
    wrapper.innerHTML = '<div class="no-data-container"><h3>운영진 데이터가 없습니다.</h3></div>';
    return;
  }
  
  // 1. Leader Row
  html += `
    <div class="org-row">
      <div class="org-card leader-card">
        <div class="org-badge badge-leader">👑 클랜장</div>
        <div class="org-name">${escapeHTML(leader.battleTag)}</div>
        <div class="org-kakao">${escapeHTML(leader.kakaoProfile)}</div>
        <div class="org-poe">${escapeHTML(leader.poe2Account || 'POE2 계정 없음')}</div>
        <div class="org-date">가입일: ${escapeHTML(leader.joinDate)}</div>
      </div>
    </div>
  `;
  
  // Line connector between Leader and Vice Leader
  if (viceLeader) {
    html += `
      <div class="org-connector-vertical"></div>
      <div class="org-row">
        <div class="org-card vice-card">
          <div class="org-badge badge-vice">⚔️ 부클랜장</div>
          <div class="org-name">${escapeHTML(viceLeader.battleTag)}</div>
          <div class="org-kakao">${escapeHTML(viceLeader.kakaoProfile)}</div>
          <div class="org-poe">${escapeHTML(viceLeader.poe2Account || 'POE2 계정 없음')}</div>
          <div class="org-date">가입일: ${escapeHTML(viceLeader.joinDate)}</div>
        </div>
      </div>
    `;
  }
  
  // Line connector between Vice Leader and Officers
  if (officers.length > 0) {
    html += `
      <div class="org-connector-vertical"></div>
      <div class="org-row officers-row">
    `;
    officers.forEach(officer => {
      html += `
        <div class="org-card officer-card">
          <div class="org-badge badge-officer">🛡️ 운영진</div>
          <div class="org-name">${escapeHTML(officer.battleTag)}</div>
          <div class="org-kakao">${escapeHTML(officer.kakaoProfile)}</div>
          <div class="org-poe">${escapeHTML(officer.poe2Account || 'POE2 계정 없음')}</div>
          <div class="org-date">가입일: ${escapeHTML(officer.joinDate)}</div>
        </div>
      `;
    });
    html += `
      </div>
    `;
  }
  
  wrapper.innerHTML = html;
}

// 탈퇴자 명단 렌더링
function renderDepartedMembers() {
  const tableBody = document.getElementById('departed-table-body');
  const countDisplay = document.getElementById('departed-count');
  const noDataView = document.getElementById('no-departed-view');
  if (!tableBody) return;

  const searchQuery = document.getElementById('search-input-departed')?.value.toLowerCase().trim() || '';

  // 필터링
  const filtered = departedMembers.filter(m => {
    const matchesSearch = !searchQuery || 
      m.battleTag.toLowerCase().includes(searchQuery) ||
      m.kakaoProfile.toLowerCase().includes(searchQuery) ||
      m.poe2Account.toLowerCase().includes(searchQuery);
    return matchesSearch;
  });

  // 카운트 표시
  if (countDisplay) {
    countDisplay.textContent = filtered.length;
  }

  // 데이터 여부에 따른 뷰 조절
  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    if (noDataView) noDataView.style.display = 'block';
    return;
  }

  if (noDataView) noDataView.style.display = 'none';

  let html = '';
  filtered.forEach((m, index) => {
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>
          <span class="battletag-text">${escapeHTML(m.battleTag)}</span>
        </td>
        <td>${escapeHTML(m.kakaoProfile)}</td>
        <td>${escapeHTML(m.poe2Account)}</td>
        <td>${escapeHTML(m.joinDate)}</td>
        <td><span class="badge" style="background: rgba(220, 38, 38, 0.1); color: var(--danger); font-size: 0.75rem; border: 1px solid var(--border-color);">${escapeHTML(m.leaveDate)}</span></td>
        <td style="text-align: right; font-weight: 600;">${m.chatCount}</td>
        <td style="color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(m.notes)}">${escapeHTML(m.notes)}</td>
        <td style="text-align: center;">
          <div class="row-actions" style="justify-content: center; gap: 8px;">
            <button onclick="restoreMember('${m.id}')" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem; color: var(--success); border-color: rgba(5, 150, 105, 0.3);" title="길드원으로 복구">🔄 복구</button>
            <button onclick="deleteDepartedPermanently('${m.id}')" class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size: 0.75rem;" title="영구 삭제">🗑️ 삭제</button>
            <button onclick="blacklistMember('${m.id}', 'departed')" class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size: 0.75rem; background: rgba(220, 38, 38, 0.2); color: var(--danger); border-color: rgba(220, 38, 38, 0.4);" title="블랙리스트 등록">🚫 블랙</button>
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// 탈퇴자 복구
window.restoreMember = function(id) {
  const item = departedMembers.find(m => m.id === id);
  if (!item) return;

  if (confirm(`'${item.battleTag}'님을 다시 길드원 명단으로 복구하시겠습니까?`)) {
    // 일반 길드원으로 복구
    const activeItem = {
      ...item,
      id: "member_" + item.battleTag,
      role: item.role || "member",
      isSpecial: item.isSpecial || false,
      warning: item.warning || false,
      notes: item.notes === "자진 탈퇴" ? "" : item.notes
    };
    
    // 복구 시 탈퇴일 삭제
    delete activeItem.leaveDate;

    members.push(activeItem);
    departedMembers = departedMembers.filter(m => m.id !== id);

    saveToLocalStorage();
    saveDepartedToLocalStorage();
    updateAppView();
    showToast(`'${item.battleTag}'님이 길드원으로 성공적으로 복구되었습니다.`, 'success');
  }
};

// 탈퇴자 영구 삭제
window.deleteDepartedPermanently = function(id) {
  const item = departedMembers.find(m => m.id === id);
  if (!item) return;

  if (confirm(`'${item.battleTag}'님의 탈퇴 기록을 정말로 영구 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.`)) {
    departedMembers = departedMembers.filter(m => m.id !== id);
    saveDepartedToLocalStorage();
    updateAppView();
    showToast(`'${item.battleTag}'님의 데이터가 영구 삭제되었습니다.`, 'danger');
  }
};

// 블랙리스트 명단 렌더링
function renderBlacklist() {
  const tableBody = document.getElementById('blacklist-table-body');
  const countDisplay = document.getElementById('blacklist-count');
  const noDataView = document.getElementById('no-blacklist-view');
  if (!tableBody) return;

  const searchQuery = document.getElementById('search-input-blacklist')?.value.toLowerCase().trim() || '';

  // 필터링
  const filtered = blacklist.filter(m => {
    const matchesSearch = !searchQuery || 
      m.battleTag.toLowerCase().includes(searchQuery) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery));
    return matchesSearch;
  });

  // 카운트 표시
  if (countDisplay) {
    countDisplay.textContent = filtered.length;
  }

  // 데이터 여부에 따른 뷰 조절
  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    if (noDataView) noDataView.style.display = 'block';
    return;
  }

  if (noDataView) noDataView.style.display = 'none';

  let html = '';
  filtered.forEach((m, index) => {
    if (m.isTemp) {
      html += `
        <tr style="background: rgba(220, 38, 38, 0.05);">
          <td>${index + 1}</td>
          <td>
            <input type="text" id="edit-blacklist-battletag" placeholder="배틀태그#12345" style="width: 100%; max-width: 220px; background: var(--bg-input); border: 1px solid var(--danger); padding: 4px 8px; border-radius: 4px; color: var(--text-primary); font-weight: bold;" value="${escapeHTML(m.battleTag)}">
          </td>
          <td><span class="badge" style="background: rgba(220, 38, 38, 0.15); color: var(--danger); font-size: 0.75rem; border: 1px solid var(--border-color);">${escapeHTML(m.blacklistedDate)}</span></td>
          <td>
            <input type="text" id="edit-blacklist-notes" placeholder="블랙리스트 등록 사유 입력" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 4px; color: var(--text-primary);" value="${escapeHTML(m.notes)}">
          </td>
          <td style="text-align: center;">
            <div class="row-actions" style="justify-content: center; gap: 8px;">
              <button onclick="saveInlineBlacklist()" class="btn btn-primary btn-sm" style="padding: 4px 8px; font-size: 0.75rem; background: var(--success); border-color: var(--success);" title="저장">💾 저장</button>
              <button onclick="cancelInlineBlacklist()" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;" title="취소">❌ 취소</button>
            </div>
          </td>
        </tr>
      `;
    } else {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <span class="battletag-text" style="color: var(--danger); font-weight: bold;">${escapeHTML(m.battleTag)}</span>
          </td>
          <td><span class="badge" style="background: rgba(220, 38, 38, 0.15); color: var(--danger); font-size: 0.75rem; border: 1px solid var(--border-color);">${escapeHTML(m.blacklistedDate)}</span></td>
          <td style="color: var(--text-secondary); max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(m.notes)}">${escapeHTML(m.notes)}</td>
          <td style="text-align: center;">
            <div class="row-actions" style="justify-content: center; gap: 8px;">
              <button onclick="restoreBlacklistMember('${m.id}')" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem; color: var(--success); border-color: rgba(5, 150, 105, 0.3);" title="길드원으로 복구">🔄 해제</button>
              <button onclick="deleteBlacklistPermanently('${m.id}')" class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size: 0.75rem;" title="영구 삭제">🗑️ 삭제</button>
            </div>
          </td>
        </tr>
      `;
    }
  });

  tableBody.innerHTML = html;
}

// 블랙리스트 해제 및 길드원 복구
window.restoreBlacklistMember = function(id) {
  const item = blacklist.find(m => m.id === id);
  if (!item) return;

  if (confirm(`'${item.battleTag}'님을 블랙리스트에서 해제하고 일반 길드원으로 복구하시겠습니까?`)) {
    const activeItem = {
      ...item,
      id: "member_" + item.battleTag,
      role: item.role || "member",
      isSpecial: item.isSpecial || false,
      warning: item.warning || false,
      notes: item.notes === "사유 미작성" ? "" : item.notes
    };
    
    delete activeItem.blacklistedDate;

    members.push(activeItem);
    blacklist = blacklist.filter(m => m.id !== id);

    saveToLocalStorage();
    saveBlacklistToLocalStorage();
    updateAppView();
    showToast(`'${item.battleTag}'님이 블랙리스트에서 해제되어 길드원으로 복구되었습니다.`, 'success');
  }
};

// 블랙리스트 영구 삭제
window.deleteBlacklistPermanently = function(id) {
  const item = blacklist.find(m => m.id === id);
  if (!item) return;

  if (confirm(`'${item.battleTag}'님의 블랙리스트 기록을 정말로 영구 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.`)) {
    blacklist = blacklist.filter(m => m.id !== id);
    saveBlacklistToLocalStorage();
    updateAppView();
    showToast(`'${item.battleTag}'님의 블랙리스트 데이터가 영구 삭제되었습니다.`, 'danger');
  }
};

// 블랙리스트 이동 등록
window.blacklistMember = function(id, source) {
  let member = null;
  if (source === 'members') {
    member = members.find(m => m.id === id);
  } else if (source === 'departed') {
    member = departedMembers.find(m => m.id === id);
  }
  
  if (!member) return;
  
  if (confirm(`'${member.battleTag}'님을 블랙리스트에 등록하시겠습니까?\n\n이 인원은 모든 목록에서 제외되고 블랙리스트 명단으로 이동됩니다.`)) {
    const reason = prompt('블랙리스트 사유를 입력해 주세요:', '');
    if (reason === null) return;
    
    const d = new Date();
    const blacklistedDate = `${String(d.getFullYear()).slice(2)}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
    
    const blacklistItem = {
      ...member,
      id: "blacklist_" + member.battleTag,
      blacklistedDate: blacklistedDate,
      notes: reason.trim() || "사유 미작성"
    };
    
    blacklist.unshift(blacklistItem);
    
    if (source === 'members') {
      members = members.filter(m => m.id !== id);
      saveToLocalStorage();
    } else if (source === 'departed') {
      departedMembers = departedMembers.filter(m => m.id !== id);
      saveDepartedToLocalStorage();
    }
    
    saveBlacklistToLocalStorage();
    updateAppView();
    showToast(`'${member.battleTag}'님이 블랙리스트에 등록되었습니다.`, 'danger');
  }
};

// 블랙리스트 인라인 추가 행 생성
window.addInlineBlacklistRow = function() {
  // 이미 추가 중인 임시 행이 있다면 중복 생성 방지
  if (blacklist.some(m => m.id === 'temp_blacklist_new')) {
    showToast('이미 작성 중인 블랙리스트 추가 행이 존재합니다.', 'warning');
    const inputBT = document.getElementById('edit-blacklist-battletag');
    if (inputBT) inputBT.focus();
    return;
  }

  const d = new Date();
  const blacklistedDate = `${String(d.getFullYear()).slice(2)}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;

  const newItem = {
    id: "temp_blacklist_new",
    battleTag: "",
    kakaoProfile: "",
    poe2Account: "",
    blacklistedDate: blacklistedDate,
    notes: "",
    isTemp: true
  };

  blacklist.unshift(newItem);
  renderBlacklist();
  
  // 포커싱
  setTimeout(() => {
    const inputBT = document.getElementById('edit-blacklist-battletag');
    if (inputBT) inputBT.focus();
  }, 50);
};

// 인라인 작성 취소
window.cancelInlineBlacklist = function() {
  blacklist = blacklist.filter(m => m.id !== 'temp_blacklist_new');
  renderBlacklist();
};

// 인라인 작성 저장
window.saveInlineBlacklist = function() {
  const battleTagVal = document.getElementById('edit-blacklist-battletag')?.value.trim() || '';
  const notesVal = document.getElementById('edit-blacklist-notes')?.value.trim() || '';

  if (!battleTagVal) {
    alert('배틀태그를 입력해 주세요.');
    return;
  }
  if (!battleTagVal.includes('#')) {
    alert('올바른 배틀태그 형식을 입력해 주세요. (예: 배틀태그#1234)');
    return;
  }

  // 중복 확인
  if (blacklist.some(m => m.battleTag === battleTagVal && m.id !== 'temp_blacklist_new')) {
    alert('이미 블랙리스트에 등록되어 있는 배틀태그입니다.');
    return;
  }

  // 인원 명단에서도 중복 확인
  if (members.some(m => m.battleTag === battleTagVal)) {
    if (!confirm('현재 일반 길드원 명단에 존재하는 배틀태그입니다. 그래도 블랙리스트에 새로 등록하시겠습니까?')) {
      return;
    }
  }

  const tempIndex = blacklist.findIndex(m => m.id === 'temp_blacklist_new');
  if (tempIndex !== -1) {
    blacklist[tempIndex] = {
      id: "blacklist_" + battleTagVal,
      battleTag: battleTagVal,
      kakaoProfile: "",
      poe2Account: "",
      blacklistedDate: blacklist[tempIndex].blacklistedDate,
      notes: notesVal || "사유 미작성"
    };

    saveBlacklistToLocalStorage();
    updateAppView();
    renderBlacklist();
    showToast('블랙리스트에 새 인원이 수동 추가되었습니다.', 'success');
  }
};

// 정렬 방향 토글 (정순 <-> 역순)
window.toggleSortDirection = function() {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  
  // 버튼 텍스트 변경
  const btn = document.getElementById('btn-toggle-sort');
  if (btn) {
    btn.innerHTML = sortDirection === 'asc' ? '⇅ 번호 역순으로 보기' : '⇅ 번호 정순으로 보기';
  }
  
  applyFiltersAndRender();
};

// 디바운스 헬퍼 함수 (검색 시 과도한 DOM 쓰기 방지)
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 애플리케이션 진입점
document.addEventListener('DOMContentLoaded', initializeApp);
