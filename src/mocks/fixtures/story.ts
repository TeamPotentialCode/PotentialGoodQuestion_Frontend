// 목 스토리 픽스처 — 현재 콘텐츠는 대표 이야기 "방귀 뀌는 며느리".
// 텍스트는 자체 작성 플레이스홀더 — 테스시드 데이터 확정 시 이 파일의 값만 교체한다.
// 씬 구성·requiredElements·maxTurns는 팀 공지(team-notice-20260808) 값 그대로.
import type {
  NarrationItem,
  StoryCard,
  StoryDetail,
  ThinkingElement,
} from '@/core/api/types';

export const MOCK_STORY: StoryCard = {
  id: 1,
  title: '방귀 뀌는 며느리',
  summary: '큰 방귀를 부끄러워하던 며느리가 자신의 다름을 장점으로 바꾸는 이야기',
  difficulty: '보통',
  topics: ['다름', '자기이해', '장점 발견'],
  estimatedMinutes: 15,
  thumbnailUrl: '/mock-assets/banggui-thumb.png',
  status: 'published',
};

export const MOCK_STORY_DETAIL: Omit<StoryDetail, 'activeSession'> = {
  ...MOCK_STORY,
  intro: '옛날 옛날, 방귀를 아주 크게 뀌는 며느리가 살았어요.',
  childRole: '며느리의 고민을 들어주는 친구',
  sceneCount: 4,
  postActivity: {
    cards: [
      { id: 1, text: '며느리가 방귀를 참으며 점점 야위어 갔어요.', imageUrl: '/mock-assets/card-1.png' },
      { id: 2, text: '며느리가 큰 방귀를 뀌자 집이 흔들렸어요.', imageUrl: '/mock-assets/card-2.png' },
      { id: 3, text: '며느리는 방귀로 배를 떨어뜨려 사람들을 도왔어요.', imageUrl: '/mock-assets/card-3.png' },
      { id: 4, text: '모두가 며느리의 방귀를 자랑스러워했어요.', imageUrl: '/mock-assets/card-4.png' },
    ],
    keywordCount: 4,
  },
};

export const POST_ORDER_ANSWER = [1, 2, 3, 4];
export const POST_KEYWORDS = ['방귀', '며느리', '참다', '시원하다'];

export interface MockDialogueScene {
  sceneId: number;
  sceneOrder: number;
  characterName: string;
  narration: NarrationItem[];
  characterOpening: string;
  characterClosing: string;
  requiredElements: ThinkingElement[];
  maxTurns: number;
  preferredTurns: number;
  hasMission: boolean;
}

function narration(sceneId: number, sceneOrder: number, text: string): NarrationItem {
  return { sceneId, sceneOrder, text, imageUrl: `/mock-assets/scene-${sceneOrder}.png` };
}

// 고정 대사의 ㅇㅇ은 아이 이름으로 치환된다 (백엔드 동작 미러링)
export function withChildName(text: string, childName: string): string {
  return text.replaceAll('ㅇㅇ', childName);
}

export const DIALOGUE_SCENES: MockDialogueScene[] = [
  {
    sceneId: 3,
    sceneOrder: 3,
    characterName: '며느리',
    narration: [
      narration(1, 1, '옛날 어느 마을에 방귀를 아주 크게 뀌는 며느리가 살았어요. 며느리는 시집온 뒤로 방귀를 꾹 참았어요.'),
      narration(2, 2, '방귀를 참은 며느리는 얼굴이 노래지고 점점 야위어 갔어요. 시아버지는 그런 며느리가 걱정되었어요.'),
    ],
    characterOpening: 'ㅇㅇ아, 사실 나는 방귀가 너무 커서 참고 있어. 아무한테도 말을 못 하겠어. 나는 어떻게 하면 좋을까?',
    characterClosing: '그래도 아직은 못 말하겠어. 조금만 더 참아 볼게. 이야기 들어줘서 고마워, ㅇㅇ아.',
    requiredElements: ['PERSPECTIVE', 'EMOTION', 'REASON', 'SOLUTION'],
    maxTurns: 4,
    preferredTurns: 2,
    hasMission: false,
  },
  {
    sceneId: 5,
    sceneOrder: 5,
    characterName: '시아버지',
    narration: [
      narration(4, 4, '어느 날 며느리는 용기를 내어 가족들 앞에서 방귀 이야기를 꺼냈어요. 가족들은 깜짝 놀랐지요.'),
    ],
    characterOpening: 'ㅇㅇ아, 며느리가 방귀 때문에 그렇게 힘들어했다는구나. 나는 며느리에게 뭐라고 말해 주면 좋을까?',
    characterClosing: '그래, 네 말을 들으니 마음이 놓이는구나. 며느리에게 마음껏 뀌라고 해야겠다. 고맙다, ㅇㅇ아.',
    requiredElements: ['PERSPECTIVE', 'EMOTION', 'REASON', 'SOLUTION'],
    maxTurns: 5,
    preferredTurns: 3,
    hasMission: false,
  },
  {
    sceneId: 7,
    sceneOrder: 7,
    characterName: '마을 이장',
    narration: [
      narration(6, 6, '며느리가 마음껏 방귀를 뀌자 집이 흔들리고 마을까지 소문이 났어요. 마을 사람들은 수군거렸어요.'),
    ],
    characterOpening: 'ㅇㅇ아, 며느리의 방귀가 너무 세서 마을이 시끄럽다는 사람들이 있어. 이 문제를 어떻게 해결하면 좋겠니?',
    characterClosing: '옳지, 그런 방법이 있었구나! 며느리와 이야기해 봐야겠다. 지혜를 빌려줘서 고맙다, ㅇㅇ아.',
    requiredElements: ['SOLUTION', 'REASON', 'REQUEST', 'RESULT'],
    maxTurns: 5,
    preferredTurns: 3,
    hasMission: true,
  },
  {
    sceneId: 9,
    sceneOrder: 9,
    characterName: '며느리',
    narration: [
      narration(8, 8, '마침 마을 앞 배나무에 배가 잔뜩 열렸는데 아무도 따지 못했어요. 며느리가 방귀를 뀌어 배를 우수수 떨어뜨렸답니다.'),
    ],
    characterOpening: 'ㅇㅇ아, 내 방귀로 배를 떨어뜨려서 모두가 기뻐했어! 이제 내 방귀가 부끄럽지 않아. 너는 오늘 이야기에서 어떤 마음이 들었어?',
    characterClosing: '네 이야기를 들으니 나도 내가 더 자랑스러워졌어. 함께해 줘서 정말 고마워, ㅇㅇ아!',
    requiredElements: ['EMOTION', 'PERSPECTIVE', 'RESULT', 'SOLUTION'],
    maxTurns: 4,
    preferredTurns: 2,
    hasMission: true,
  },
];

// 발화 텍스트에서 사고 요소를 결정적으로 탐지하기 위한 키워드 테이블.
// 요소 코드 문자열(REASON 등)을 직접 타이핑해도 탐지된다 (session-store 참조)
export const ELEMENT_KEYWORDS: Record<ThinkingElement, string[]> = {
  REASON: ['때문', '왜냐하면', '그래서 그런'],
  EMOTION: ['창피', '속상', '기뻐', '부끄', '슬펐', '무서'],
  PERSPECTIVE: ['입장', '마음이', '생각했', '느꼈을'],
  SOLUTION: ['방법', '말해 보', '하면 돼', '하면 좋겠'],
  REQUEST: ['해 주세', '해줘', '부탁'],
  RESULT: ['그러면', '될 거', '결과'],
  DECISION: ['나라면', '할래', '정했'],
  EMPATHY: ['힘들었겠', '불쌍', '괜찮아'],
};

// 씬별 제안 발화 — STT 목이 순서대로 반환한다.
// 각 문장이 필수 요소 2개씩을 포함해 preferredTurns 안에 GOAL_MET에 도달할 수 있다
export const SUGGESTED_UTTERANCES: Record<number, string[]> = {
  3: [
    '며느리 입장에서는 참느라 정말 속상했을 것 같아요.', // PERSPECTIVE + EMOTION
    '참으면 병이 나기 때문에 가족들한테 말해 보면 돼요.', // REASON + SOLUTION
    '많이 힘들었겠다, 괜찮아.', // EMPATHY (추가 턴용)
  ],
  5: [
    '며느리 입장에서는 말 못 해서 정말 속상했을 것 같아요.', // PERSPECTIVE + EMOTION
    '참으면 아프기 때문에 집에서는 마음껏 뀌라고 말해 보면 돼요.', // REASON + SOLUTION
    '며느리 마음이 얼마나 무서웠을지 생각했어요.', // PERSPECTIVE + EMOTION
  ],
  7: [
    '멀리 떨어진 밭에서 뀌는 방법이 있어요, 시끄럽기 때문이에요.', // SOLUTION + REASON
    '마을 사람들에게 미리 알려 달라고 부탁해 주세요.', // REQUEST
    '그러면 다들 놀라지 않게 될 거예요.', // RESULT
  ],
  9: [
    '나도 정말 기뻐! 며느리 마음이 뿌듯했을 것 같아.', // EMOTION + PERSPECTIVE
    '방귀로 배를 떨어뜨리는 방법을 쓰니까 모두 좋아하게 될 거야.', // SOLUTION + RESULT
    '나라면 이제 자랑할래!', // DECISION
  ],
};
