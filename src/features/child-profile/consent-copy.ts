/*
 * 아동 개인정보 수집·이용 안내 문구.
 *
 * 시안에도 본문이 `[운영사 최종 문구 입력]` 플레이스홀더로 남아 있다 —
 * 법무 확인이 끝나면 이 파일만 갈아끼우면 되도록 한곳에 모아 둔다.
 */

/** 백엔드 ChildConsent.consentVersion (20자 이내). 문구를 바꾸면 이 값도 올려야 한다 */
export const CONSENT_VERSION = 'mvp_v1';

/** 백엔드 주석의 세 가지 중 온라인 보호자 직접 동의에 해당한다 */
export const VERIFICATION_METHOD = 'authenticated_parent';

export const CONSENT_SECTIONS: { title: string; body: string }[] = [
  { title: '수집·이용 목적', body: '[운영사 최종 문구 입력]' },
  { title: '수집하는 개인정보', body: '[운영사 최종 문구 입력]' },
  { title: '보유·이용 기간', body: '[운영사 최종 문구 입력]' },
  { title: '동의하지 않을 수 있어요', body: '[운영사 최종 문구 입력]' },
];
