import { apiRequest } from '@/core/api/client';
import type { SceneInfo } from '@/core/api/types';
import type { ScenePlan } from '@/core/play-session/types';

/**
 * 대화 화면이 장면을 얻는 유일한 통로.
 *
 * 백엔드에 **장면 목록 API가 없어서** sceneId 를 1부터 훑어 목록을 만든다.
 * 시드가 id 와 sceneOrder 가 같은 순서라 동작하지만 **가정에 기댄 임시 구현**이다.
 * `GET /api/stories/{storyId}/scenes` 가 생기면 loadStoryScenes 만 요청 한 번으로 바꾸면 된다.
 *
 * 한 이야기의 장면은 내레이션과 대화가 번갈아 나온다(시드 기준 1·2 내레이션 → 3 대화 → 4 내레이션 …).
 * 내레이션 장면은 characterName·characterOpening 이 null 이다.
 */
const MAX_SCENE_ID = 30;
const STOP_AFTER_CONSECUTIVE_MISSES = 2;

const cache = new Map<number, SceneInfo[]>();

/** 대화 장면 앞에 붙는 내레이션 한 장. 화면 하나에 해당한다 */
export interface NarrationPage {
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

/**
 * `fromSceneId` 부터 이어지는 내레이션들과 그 뒤 첫 대화 장면을 묶어 재생 계획으로 만든다.
 * 대화 장면이 끝나면 다음 장면 id 로 다시 불러 그 사이 내레이션을 이어서 보여준다.
 */
export async function loadScene(storyId: number, fromSceneId: number): Promise<LoadedScene> {
  const scenes = await loadStoryScenes(storyId);
  const dialogues = scenes.filter(isDialogue);
  const narrations = scenes.filter((scene) => !isDialogue(scene));

  const from = scenes.find((scene) => scene.sceneId === fromSceneId);
  const fromOrder = from?.sceneOrder ?? 0;

  const current = dialogues.find((scene) => scene.sceneOrder >= fromOrder) ?? dialogues[0];
  if (!current) {
    throw new Error(`대화 장면이 없습니다 (storyId=${storyId})`);
  }

  // 이 대화 장면 **바로 앞에 붙어 있는** 내레이션들이 지금 들려줄 도입부다.
  // 세션의 currentSceneId 는 대화 장면(예: 3)을 가리키므로 fromOrder 로 자르면
  // 그 앞 내레이션(1·2)이 통째로 빠진다 — 그래서 뒤에서부터 거슬러 모은다
  const index = scenes.indexOf(current);
  const preceding: SceneInfo[] = [];
  for (let i = index - 1; i >= 0 && !isDialogue(scenes[i]); i -= 1) {
    preceding.unshift(scenes[i]);
  }

  const pages: NarrationPage[] = preceding.map((scene) => ({
    text: scene.sceneDescription,
    imageUrl: scene.imageUrl,
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
    imageUrl: current.imageUrl,
    narration: pages,
    narrationTotal: narrations.length,
    dialogueIndex: dialogues.indexOf(current) + 1,
    dialogueTotal: dialogues.length,
  };
}
