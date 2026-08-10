import { apiRequest } from '@/core/api/client';
import type { SceneInfo } from '@/core/api/types';
import type { ScenePlan } from '@/core/play-session/types';

/**
 * 대화 화면이 장면을 얻는 유일한 통로.
 *
 * 백엔드에 **장면 목록 API가 없어서** 지금은 sceneId 를 하나씩 조회한다.
 * 세션의 currentSceneId 가 내레이션 장면(characterName === null)을 가리키므로,
 * 첫 대화 장면을 찾을 때까지 id 를 1씩 올려가며 훑는다.
 *
 * 시드가 id 와 sceneOrder 가 같은 순서라 동작하지만 **가정에 기댄 임시 구현**이다.
 * `GET /api/stories/{storyId}/scenes` 가 생기면 이 파일만 바꾸면 된다
 * (아래 dialogueSceneFrom 을 목록 조회 한 번으로 대체).
 */
const MAX_PROBE = 10;

export interface LoadedScene {
  plan: ScenePlan;
  characterName: string;
  characterOpening: string;
  imageUrl: string | null;
}

function getScene(storyId: number, sceneId: number): Promise<SceneInfo> {
  return apiRequest<SceneInfo>(`/stories/${storyId}/scenes/${sceneId}`);
}

export async function loadScene(storyId: number, fromSceneId: number): Promise<LoadedScene> {
  for (let sceneId = fromSceneId; sceneId < fromSceneId + MAX_PROBE; sceneId += 1) {
    let scene: SceneInfo;
    try {
      scene = await getScene(storyId, sceneId);
    } catch {
      continue; // 없는 id 는 건너뛴다
    }
    if (scene.characterName === null) continue; // 내레이션 장면

    return {
      plan: {
        sceneId: scene.sceneId,
        // 내레이션 재생은 다음 작업이다. 지금은 비워서 곧바로 첫 대사로 넘어간다
        narrationSentences: [],
        // 백엔드가 maxTurns 를 내려주지 않는다. 받으면 여기에 채운다
        maxTurns: 0,
      },
      characterName: scene.characterName,
      characterOpening: scene.characterOpening ?? '',
      imageUrl: scene.imageUrl,
    };
  }

  throw new Error(`대화 장면을 찾지 못했습니다 (storyId=${storyId}, from=${fromSceneId})`);
}
