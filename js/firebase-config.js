// =====================================================
//  Firebase 설정 — 구글 로그인 + 계정에 기록 저장
//
//  Firebase 콘솔에서 웹 앱을 만들면 나오는 firebaseConfig 값을 여기에 붙여 넣어요.
//  (방법은 '로그인_설정하는_방법.md' 를 보세요)
//
//  이 값들은 "공개해도 되는 값"이에요. 누구나 볼 수 있는 게 정상이고,
//  남의 기록을 못 건드리게 막는 건 Firebase 의 '보안 규칙'이 해요.
//
//  apiKey 가 비어 있으면 로그인 버튼이 안 보이고, 게임은 예전처럼 이 컴퓨터에만 저장해요.
// =====================================================
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB7j5voZGFd1KCosvEvLR9xlSLqMfy1Wrg',
  authDomain: 'lake-fishing.firebaseapp.com',
  projectId: 'lake-fishing',
  appId: '1:439412637344:web:783dd768b9a5c28269d3c5'
};
