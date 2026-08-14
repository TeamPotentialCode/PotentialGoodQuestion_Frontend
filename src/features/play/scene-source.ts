import { apiRequest } from '@/core/api/client';
import type { SceneInfo } from '@/core/api/types';
import type { ScenePlan } from '@/core/play-session/types';
import { sceneImage } from '@/features/story/images';

/**
 * 대화 화면이 장면을 얻는 유일한 통로.
 *
 * `GET /stories/{storyId}/scenes` 목록 한 번으로 받는다(백엔드 38cbb55).
 * 목록 API 가 없는 구버전 배포를 만나면 앵커(세션이 아는 장면 id)에서
 * 앞뒤 연속 id 를 훑는 예전 방식으로 폴백한다.
 *
 * 내레이션 장면은 characterName·characterOpening 이 null 이다.
 */
const MAX_SCENES = 30;
const STOP_AFTER_CONSECUTIVE_MISSES = 2;

const cache = new Map<number, SceneInfo[]>();

/** 대화 장면 앞에 붙는 내레이션 한 장. 화면 하나에 해당한다 */
export interface NarrationPage {
  /** 완료 알림(narration-complete)에 쓰는 장면 id */
  sceneId: number;
  text: string;
  imageUrl: string | null;
  /** 이야기 전체 내레이션 중 몇 번째인지 (1부터) — 헤더의 "시작 (n/5)" */
  narrationIndex: number;
}

export interface LoadedScene {
  plan: ScenePlan;
  characterName: string;
  /** 고정 대사 원문. ㅇㅇ 자리표시자를 그대로 둔다(화면이 주석으로 설명한다) */
  characterOpening: string;
  sceneDescription: string;
  imageUrl: string | null;
  /** 이 대화 장면 앞에 재생할 내레이션들. plan.narrationSentences 와 순서가 같다 */
  narration: NarrationPage[];
  /** 이야기 전체 내레이션 장면 수 */
  narrationTotal: number;
  /** 대화 장면 중 몇 번째인지 (1부터) */
  dialogueIndex: number;
  /** 이 이야기의 대화 장면 총 개수 */
  dialogueTotal: number;
}

const isDialogue = (scene: SceneInfo) => scene.characterName !== null;

async function fetchScene(storyId: number, sceneId: number): Promise<SceneInfo | null> {
  try {
    return await apiRequest<SceneInfo>(`/stories/${storyId}/scenes/${sceneId}`);
  } catch {
    return null;
  }
}

/**
 * 이야기의 장면 전체를 sceneOrder 순으로. 스토리별로 한 번만 받는다.
 * anchorSceneId 는 목록 API 가 없는 구버전 폴백에서만 쓴다
 */
export async function loadStoryScenes(storyId: number, anchorSceneId: number): Promise<SceneInfo[]> {
  const cached = cache.get(storyId);
  if (cached) return cached;

  // 정상 경로: 목록 한 번
  try {
    const listed = await apiRequest<SceneInfo[]>(`/stories/${storyId}/scenes`);
    if (listed.length > 0) {
      listed.sort((a, b) => a.sceneOrder - b.sceneOrder);
      cache.set(storyId, listed);
      return listed;
    }
  } catch {
    // 목록 API 가 없는 배포 — 아래 앵커 탐색으로 폴백
  }

  const scenes: SceneInfo[] = [];
  const anchor = await fetchScene(storyId, anchorSceneId);
  if (anchor) scenes.push(anchor);

  // 앵커 뒤쪽(id 증가)으로 — 연속 실패 2번이면 블록의 끝이다
  let misses = 0;
  for (let id = anchorSceneId + 1; id <= anchorSceneId + MAX_SCENES && misses < STOP_AFTER_CONSECUTIVE_MISSES; id += 1) {
    const scene = await fetchScene(storyId, id);
    if (scene) {
      scenes.push(scene);
      misses = 0;
    } else {
      misses += 1;
    }
  }
  // 앵커 앞쪽(id 감소)으로 — 이어하기로 중간 장면에서 시작해도 도입까지 거슬러 모은다
  misses = 0;
  for (let id = anchorSceneId - 1; id >= 1 && id >= anchorSceneId - MAX_SCENES && misses < STOP_AFTER_CONSECUTIVE_MISSES; id -= 1) {
    const scene = await fetchScene(storyId, id);
    if (scene) {
      scenes.push(scene);
      misses = 0;
    } else {
      misses += 1;
    }
  }

  scenes.sort((a, b) => a.sceneOrder - b.sceneOrder);
  cache.set(storyId, scenes);
  return scenes;
}

/**
 * `fromSceneId` 부터 이어지는 내레이션들과 그 뒤 첫 대화 장면을 묶어 재생 계획으로 만든다.
 * 대화 장면이 끝나면 다음 장면 id 로 다시 불러 그 사이 내레이션을 이어서 보여준다.
 */
export async function loadScene(
  storyId: number,
  fromSceneId: number,
  /** 이 기기에서 이미 본 내레이션 장면 id — 재개 시 건너뛴다 */
  watched: ReadonlySet<number> = new Set(),
): Promise<LoadedScene> {
  const scenes = await loadStoryScenes(storyId, fromSceneId);
  const dialogues = scenes.filter(isDialogue);
  const narrations = scenes.filter((scene) => !isDialogue(scene));

  const from = scenes.find((scene) => scene.sceneId === fromSceneId);
  const fromOrder = from?.sceneOrder ?? 0;

  const current = dialogues.find((scene) => scene.sceneOrder >= fromOrder) ?? dialogues[0];
  if (!current) {
    throw new Error(`대화 장면이 없습니다 (storyId=${storyId})`);
  }

  // 이 대화 장면 **바로 앞에 붙어 있는** 내레이션들이 지금 들려줄 도입부다.
  const index = scenes.indexOf(current);
  let preceding: SceneInfo[] = [];
  for (let i = index - 1; i >= 0 && !isDialogue(scenes[i]); i -= 1) {
    preceding.unshift(scenes[i]);
  }
  /*
   * 재개 지점이 내레이션이면(narration-complete 로 서버가 위치를 기억한다)
   * 이미 본 앞 장들은 건너뛴다. 재개 지점이 대화면 — 직전 대화가 끝나
   * 다음 대화로 넘어온 경우라 그 사이 내레이션은 아직 안 본 것 — 전부 보여준다
   */
  if (from && !isDialogue(from)) {
    preceding = preceding.filter((scene) => scene.sceneOrder >= from.sceneOrder);
  }
  // 이 기기에서 이미 본 장은 건너뛴다 — 커서가 대화를 가리키는 재개에서도 반복이 없다
  preceding = preceding.filter((scene) => !watched.has(scene.sceneId));

  // 백엔드 imageUrl 은 실재하지 않는 더미라 프로젝트 삽화를 먼저 본다
  const pages: NarrationPage[] = preceding.map((scene) => ({
    sceneId: scene.sceneId,
    text: scene.sceneDescription,
    imageUrl: sceneImage(storyId, scene.sceneOrder) ?? scene.imageUrl,
    narrationIndex: narrations.indexOf(scene) + 1,
  }));

  return {
    plan: {
      sceneId: current.sceneId,
      narrationSentences: pages.map((page) => page.text),
      // 백엔드가 maxTurns 를 내려주지 않는다. 받으면 여기에 채운다
      maxTurns: 0,
    },
    characterName: current.characterName ?? '',
    characterOpening: current.characterOpening ?? '',
    // 대화 장면 자기 설명은 내레이션이 아니라 대화 화면 좌측 카드에 쓴다
    sceneDescription: current.sceneDescription,
    imageUrl: sceneImage(storyId, current.sceneOrder) ?? current.imageUrl,
    narration: pages,
    narrationTotal: narrations.length,
    dialogueIndex: dialogues.indexOf(current) + 1,
    dialogueTotal: dialogues.length,
  };
}
