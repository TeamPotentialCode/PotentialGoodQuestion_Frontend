import { apiRequest } from '@/core/api/client';
import type { SceneInfo } from '@/core/api/types';
import type { ScenePlan } from '@/core/play-session/types';

/**
 * 대화 화면이 장면을 얻는 유일한 통로.
 *
 * 백엔드에 **장면 목록 API가 없어서** sceneId 를 1부터 훑어 목록을 만든다.
 * 시드가 id 와 sceneOrder 가 같은 순서라 동작하지만 **가정에 기댄 임시 구현**이다.
 * `GET /api/stories/{storyId}/scenes` 가 생기면 loadStoryScenes 만 요청 한 번으로 바꾸면 된다.
 */
const MAX_SCENE_ID = 30;
const STOP_AFTER_CONSECUTIVE_MISSES = 2;

const cache = new Map<number, SceneInfo[]>();

export interface LoadedScene {
  plan: ScenePlan;
  characterName: string;
  /** 고정 대사 원문. ㅇㅇ 자리표시자를 그대로 둔다(화면이 주석으로 설명한다) */
  characterOpening: string;
  sceneDescription: string;
  imageUrl: string | null;
  /** 대화 장면 중 몇 번째인지 (1부터) */
  dialogueIndex: number;
  /** 이 이야기의 대화 장면 총 개수 */
  dialogueTotal: number;
}

/** 이야기의 장면 전체를 sceneOrder 순으로. 스토리별로 한 번만 훑는다 */
export async function loadStoryScenes(storyId: number): Promise<SceneInfo[]> {
  const cached = cache.get(storyId);
  if (cached) return cached;

  const scenes: SceneInfo[] = [];
  let misses = 0;
  for (let sceneId = 1; sceneId <= MAX_SCENE_ID && misses < STOP_AFTER_CONSECUTIVE_MISSES; sceneId += 1) {
    try {
      scenes.push(await apiRequest<SceneInfo>(`/stories/${storyId}/scenes/${sceneId}`));
      misses = 0;
    } catch {
      misses += 1;
    }
  }

  scenes.sort((a, b) => a.sceneOrder - b.sceneOrder);
  cache.set(storyId, scenes);
  return scenes;
}

/** `fromSceneId` 이후의 첫 대화 장면(characterName !== null)을 찾아 재생 계획으로 만든다 */
export async function loadScene(storyId: number, fromSceneId: number): Promise<LoadedScene> {
  const scenes = await loadStoryScenes(storyId);
  const dialogues = scenes.filter((scene) => scene.characterName !== null);

  const from = scenes.find((scene) => scene.sceneId === fromSceneId);
  const fromOrder = from?.sceneOrder ?? 0;
  const current = dialogues.find((scene) => scene.sceneOrder >= fromOrder) ?? dialogues[0];
  if (!current) {
    throw new Error(`대화 장면이 없습니다 (storyId=${storyId})`);
  }

  return {
    plan: {
      sceneId: current.sceneId,
      // 장면 설명을 먼저 들려준 뒤 캐릭터 첫 대사로 넘어간다(시안의 좌측 설명 영역)
      narrationSentences: current.sceneDescription ? [current.sceneDescription] : [],
      // 백엔드가 maxTurns 를 내려주지 않는다. 받으면 여기에 채운다
      maxTurns: 0,
    },
    characterName: current.characterName ?? '',
    characterOpening: current.characterOpening ?? '',
    sceneDescription: current.sceneDescription,
    imageUrl: current.imageUrl,
    dialogueIndex: dialogues.indexOf(current) + 1,
    dialogueTotal: dialogues.length,
  };
}
