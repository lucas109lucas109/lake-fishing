// =====================================================
//  클라우드 저장: 구글 로그인 + Firebase(Firestore)에 내 기록 보관
//
//  - 비밀번호는 우리가 아예 안 받아요. 구글이 로그인을 대신 확인해 줘요.
//  - 기록은 saves/{내 계정 번호} 문서 하나에 { data: 기록 글자, savedAt: 저장 시각 } 으로 들어가요.
//  - 남의 문서는 못 읽고 못 쓰게 Firebase 보안 규칙으로 막아요 (안내서에 규칙이 있어요).
//  - Firebase 프로그램은 설정값이 있을 때만 불러와요 (없으면 게임이 더 가벼워요).
// =====================================================
import { FIREBASE_CONFIG } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const cloudEnabled = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

let fb = null; // 불러온 Firebase 도구들

async function loadSdk() {
  if (fb) return fb;
  const [appM, authM, fsM] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js')
  ]);
  const app = appM.initializeApp(FIREBASE_CONFIG);
  fb = { authM, fsM, auth: authM.getAuth(app), db: fsM.getFirestore(app) };
  return fb;
}

// 로그인 상태가 바뀔 때마다 onUser(user 또는 null) 를 불러요
export async function startCloud(onUser) {
  if (!cloudEnabled) return false;
  try {
    const { authM, auth } = await loadSdk();
    authM.onAuthStateChanged(auth, (u) => onUser(u ? { uid: u.uid, name: (u.displayName || '').split(' ')[0] || '낚시꾼' } : null));
    return true;
  } catch (e) {
    console.warn('[로그인] Firebase 를 불러오지 못했어요', e);
    return false;
  }
}

export async function signIn() {
  const { authM, auth } = await loadSdk();
  const provider = new authM.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' }); // 피씨방에서도 계정을 고를 수 있게
  await authM.signInWithPopup(auth, provider);
}

export async function signOutCloud() {
  const { authM, auth } = await loadSdk();
  await authM.signOut(auth);
}

// 내 기록 가져오기 → { data(글자), savedAt } 또는 null(아직 없음)
export async function loadCloud(uid) {
  const { fsM, db } = await loadSdk();
  const snap = await fsM.getDoc(fsM.doc(db, 'saves', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  if (typeof d.data !== 'string') return null;
  return { data: d.data, savedAt: Number(d.savedAt) || 0 };
}

// 내 기록 올리기
export async function saveCloud(uid, dataStr, savedAt) {
  if (dataStr.length > 900000) throw new Error('기록이 너무 커요');
  const { fsM, db } = await loadSdk();
  await fsM.setDoc(fsM.doc(db, 'saves', uid), { data: dataStr, savedAt: Math.floor(savedAt) });
}

// =====================================================
//  집 주인 기록: houses/{집 id} = { owner: 계정 번호, name: 이름, at: 산 시각, style: 디자인 }
//  - 문서가 없을 때만 만들 수 있어요 → 먼저 산 사람이 주인 (보안 규칙이 지켜 줘요)
//  - 누구나 읽을 수 있어서, 다른 사람도 "OOO 님의 집"과 주인이 고른 디자인을 볼 수 있어요
// =====================================================
// 집 주인 목록이 바뀔 때마다 cb({ 집id: { owner, name, style } }) 를 불러요. 못 읽으면 cb(null)
export async function watchHouses(cb) {
  if (!cloudEnabled) return;
  try {
    const { fsM, db } = await loadSdk();
    fsM.onSnapshot(fsM.collection(db, 'houses'), (snap) => {
      const map = {};
      snap.forEach((d) => { const v = d.data(); if (typeof v.owner === 'string') map[d.id] = { owner: v.owner, name: String(v.name || '낚시꾼').slice(0, 20), style: Number.isInteger(v.style) ? v.style : null }; });
      cb(map);
    }, (e) => { console.warn('[집] 주인 목록을 못 읽었어요 (보안 규칙을 확인해 주세요)', e); cb(null); });
  } catch (e) { cb(null); }
}
// 집 사기: 아무도 안 샀을 때만 성공 (이미 주인이 있으면 'taken' 오류)
export async function claimHouse(hid, uid, name, style) {
  const { fsM, db } = await loadSdk();
  const ref = fsM.doc(db, 'houses', hid);
  await fsM.runTransaction(db, async (tx) => {
    const cur = await tx.get(ref);
    if (cur.exists()) throw Object.assign(new Error('taken'), { code: 'taken', owner: cur.data().owner });
    tx.set(ref, { owner: uid, name: String(name).slice(0, 20), at: Date.now(), style });
  });
}
// 내 집 디자인 바꾸기 (다른 사람 화면에도 보이게)
export async function setHouseStyleCloud(hid, uid, style) {
  const { fsM, db } = await loadSdk();
  await fsM.updateDoc(fsM.doc(db, 'houses', hid), { style });
}
// 집 내놓기 (주인만)
export async function releaseHouse(hid) {
  const { fsM, db } = await loadSdk();
  await fsM.deleteDoc(fsM.doc(db, 'houses', hid));
}
