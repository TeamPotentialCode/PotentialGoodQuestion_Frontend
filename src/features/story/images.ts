import type { MissionType } from '@/core/api/types';

/*
 * 이야기 삽화 — 백엔드 imageUrl/thumbnailUrl 이 실재하지 않는 더미라
 * 프로젝트 public/ 에 담아 sceneOrder 로 매핑한다 (원본: 디자이너 12장, 1600w 리사이즈).
 *
 * storyId 로 거르지 않는다: MVP 는 이야기가 하나뿐인데 재시드 때마다 id 가 바뀐다
 * (실측 2026-08-14 밤: 1 → 2). 이야기가 늘어나는 시점에 제목·id 매핑을 다시 넣는다.
 * 백엔드가 실제 이미지를 호스팅하게 되면 이 모듈만 걷어내면 된다.
 */
const BASE = '/stories/1';

/**
 * sceneOrder → 삽화. 2026-08-14 재시드 구조 기준:
 * 1 도입 / 2 전개1 / 3 대화1(며느리) / 4 전개2(방귀 폭발) / 5 대화2(시아버지)
 * 6 전개3(배나무) / 7 대화3(이장) / 8 전개(방귀 발사 결과!) / 9 전개4(사과) / 10 대화4
 */
const SCENE_IMAGES: Record<number, string> = {
  1: `${BASE}/scene-1.jpg`,
  2: `${BASE}/scene-2.jpg`,
  3: `${BASE}/scene-3.jpg`,
  4: `${BASE}/scene-4.jpg`,
  5: `${BASE}/scene-5.jpg`,
  6: `${BASE}/scene-6.jpg`,
  7: `${BASE}/scene-7.jpg`,
  8: `${BASE}/finale.jpg`, // 방귀로 배가 우수수 — 새로 생긴 결과 연출 장면
  9: `${BASE}/scene-8.jpg`,
  10: `${BASE}/scene-9.jpg`,
};

export function sceneImage(storyId: number, sceneOrder: number): string | null {
  void storyId;
  return SCENE_IMAGES[sceneOrder] ?? null;
}

/** 홈·목록·상세·이어하기의 대표 이미지 — 도입 장면을 쓴다 */
// storyId 파라미터는 이야기가 늘어날 때를 위해 서명만 유지한다
export function storyThumbnail(storyId: number): string | null {
  void storyId;
  return `${BASE}/scene-1.jpg`;
}

/** 미션 안내 카드 삽화 */
export function missionImage(type: MissionType): string {
  return type === 'MISSION_1' ? `${BASE}/mission-1.jpg` : `${BASE}/mission-2.jpg`;
}

/** 방귀로 배를 떨어뜨리는 클라이맥스 — 완료 화면 완주 일러스트 */
export const FINALE_IMAGE = `${BASE}/finale.jpg`;

/**
 * 대화 장면 마무리 연출 컷. 콘텐츠 문서: "(대화3) 마지막 대사 이후에는
 * 배가 떨어지는 결과 연출이 이어진다" — 마무리 대사가 재생되는 동안 미리 보여준다.
 * 장면 id 는 재시드로 바뀌므로 "몇 번째 대화인지"로 고른다
 */
export function dialogueClosingImage(dialogueIndex: number): string | null {
  return dialogueIndex === 3 ? FINALE_IMAGE : null; // 대화3 (마을 이장, 배나무)
}

/**
 * 말하기 후 활동 카드 삽화. 카드 id 는 정답 순서(card_1~5)를 담고 있고
 * 텍스트가 이야기 국면과 1:1 이라 국면 삽화를 붙인다:
 * 1 방귀를 참는 며느리 / 2 방귀 폭발 / 3 친정길 / 4 배 떨어뜨리기 / 5 화해
 */
const CARD_IMAGES: Record<string, string> = {
  card_1: `${BASE}/scene-3.jpg`,
  card_2: `${BASE}/scene-4.jpg`,
  card_3: `${BASE}/scene-6.jpg`,
  card_4: FINALE_IMAGE,
  card_5: `${BASE}/scene-9.jpg`,
};

export function activityCardImage(storyId: number, cardId: string): string | null {
  void storyId;
  return CARD_IMAGES[cardId] ?? null;
}
