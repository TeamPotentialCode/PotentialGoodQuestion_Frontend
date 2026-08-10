import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const BP = "\\b(sm|md|lg|xl|2xl):";

// 상위 상대경로 금지 — 이게 있어야 아래 @/ 패턴들이 ../../ 로 우회당하지 않는다
const RESTRICTED_RELATIVE = [
  {
    regex: "^\\.\\./",
    message: "상위 상대경로 금지 — @/ 별칭을 쓴다 (레이어 규칙 우회 방지)",
  },
];

// group 은 glob 이 아니라 gitignore 문법이라 "@/core/audio" 하나로 하위 전체가 잡힌다
const RESTRICTED_AUDIO = [
  {
    group: ["@/core/audio"],
    message: "C-01: 오디오는 features/play/useAudioOwnership.ts 에서만 제어한다",
  },
];
const RESTRICTED_STORE = [
  {
    group: ["@/core/play-session/store"],
    message: "C-04: features/play/usePlayStore.ts 를 사용한다",
  },
];

const RESTRICTED_CORE_LAYER = [
  {
    group: ["react", "react-dom", "next", "server-only", "client-only"],
    message: "core/ 는 순수 TypeScript 다. react/next 를 import 하지 않는다",
  },
  {
    group: ["@/features", "@/app", "@/shared"],
    message: "의존 방향 위반: app → features → shared → core 한 방향만 허용",
  },
];

// no-restricted-imports 는 ImportExpression 을 방문하지 않으므로 별도로 막는다
const NO_DYNAMIC_AUDIO = {
  selector: 'ImportExpression > Literal[value=/^@\\/core\\/audio/]',
  message: "C-01: 동적 import 로도 오디오에 접근하지 않는다",
};

const NO_BREAKPOINT = [
  {
    selector: `JSXAttribute[name.name="className"] Literal[value=/${BP}/]`,
    message: "C-05: 브레이크포인트는 shared/ui 프리미티브 안에서만 사용한다",
  },
  {
    selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${BP}/]`,
    message: "C-05: 브레이크포인트는 shared/ui 프리미티브 안에서만 사용한다",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // MSW
    "public/mockServiceWorker.js",
    // Playwright 번들된 리포트 JS 가 섞여 들어옴
    "playwright-report/**",
    "test-results/**",
  ]),

  // 전역
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/core/audio/**",
      "src/features/play/useAudioOwnership.ts",
      "src/features/play/usePlayStore.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...RESTRICTED_RELATIVE,
            ...RESTRICTED_AUDIO,
            ...RESTRICTED_STORE,
          ],
        },
      ],
      "no-restricted-syntax": ["error", NO_DYNAMIC_AUDIO],
    },
  },

  // 오디오는 허용, 스토어·상대경로는 그대로 금지
  {
    files: ["src/features/play/useAudioOwnership.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...RESTRICTED_RELATIVE, ...RESTRICTED_STORE] },
      ],
    },
  },

  // 스토어는 허용, 오디오·상대경로는 그대로 금지
  {
    files: ["src/features/play/usePlayStore.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...RESTRICTED_RELATIVE, ...RESTRICTED_AUDIO] },
      ],
      "no-restricted-syntax": ["error", NO_DYNAMIC_AUDIO],
    },
  },

  // flat config 는 같은 룰을 병합하지 않고 통째로 덮어쓴다.
  {
    files: ["src/core/**/*.ts"],
    ignores: ["src/core/audio/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...RESTRICTED_RELATIVE,
            ...RESTRICTED_AUDIO,
            ...RESTRICTED_STORE,
            ...RESTRICTED_CORE_LAYER,
          ],
        },
      ],
    },
  },

  // core/audio — 자기 자신 import 는 허용, 레이어 경계는 동일 적용
  {
    files: ["src/core/audio/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...RESTRICTED_RELATIVE, ...RESTRICTED_CORE_LAYER] },
      ],
    },
  },

  // 화면 코드 — 브레이크포인트 금지.
  {
    files: ["src/app/**/*.tsx", "src/features/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error", NO_DYNAMIC_AUDIO, ...NO_BREAKPOINT],
    },
  },

  // (5) any 금지
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
]);

export default eslintConfig;
