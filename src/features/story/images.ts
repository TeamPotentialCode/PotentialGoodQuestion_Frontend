import type { MissionType } from '@/core/api/types';

/*
 * 이야기 삽화 — 백엔드 imageUrl/thumbnailUrl 이 실재하지 않는 더미라
 * 프로젝트 public/ 에 담아 sceneOrder 로 매핑한다 (원본: 디자이너 12장, 1600w 리사이즈).
 * 백엔드가 실제 이미지를 호스팅하게 되면 이 모듈만 걷어내면 된다.
 *
 * 삽화가 있는 이야기는 1번(방귀 뀌는 며느리)뿐이다 — 모르는 이야기는 null 을 돌려
 * 기존 회색 자리표시(ImageSlot 폴백)로 떨어진다.
 */
const ILLUSTRATED_STORY_ID = 1;
const BASE = '/stories/1';

/** 장면 삽화. 시드 기준 sceneOrder 1~9 (내레이션·대화 모두) */
export function sceneImage(storyId: number, sceneOrder: number): string | null {
  if (storyId !== ILLUSTRATED_STORY_ID) return null;
  if (sceneOrder < 1 || sceneOrder > 9) return null;
  return `${BASE}/scene-${sceneOrder}.jpg`;
}

/** 홈·목록·상세·이어하기의 대표 이미지 — 도입 장면을 쓴다 */
export function storyThumbnail(storyId: number): string | null {
  return storyId === ILLUSTRATED_STORY_ID ? `${BASE}/scene-1.jpg` : null;
}

/** 미션 안내 카드 삽화 */
export function missionImage(type: MissionType): string {
  return type === 'MISSION_1' ? `${BASE}/mission-1.jpg` : `${BASE}/mission-2.jpg`;
}

/** 방귀로 배를 떨어뜨리는 클라이맥스 — 완료 화면 완주 일러스트 */
export const FINALE_IMAGE = `${BASE}/finale.jpg`;

/**
 * 장면 마무리 연출 컷. 콘텐츠 문서: "(대화3) 마지막 대사 이후에는
 * 며느리의 방귀로 배가 떨어지는 결과 연출이 이어진다" — DB 에 별도 장면이 없어
 * 마무리 대사가 재생되는 동안 왼쪽 이미지를 이 컷으로 바꿔 연출한다
 */
export function sceneClosingImage(storyId: number, sceneId: number): string | null {
  if (storyId !== ILLUSTRATED_STORY_ID) return null;
  return sceneId === 7 ? FINALE_IMAGE : null; // 대화3 (마을 이장, 배나무)
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
  if (storyId !== ILLUSTRATED_STORY_ID) return null;
  return CARD_IMAGES[cardId] ?? null;
}
