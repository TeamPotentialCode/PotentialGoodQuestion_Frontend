// 임시 플레이스홀더.
// `/` 의 실제 동작(토큰 유무에 따라 /login 또는 /home 리다이렉트)은
// core/api/auth-token.ts 가 생기는 T-10 에서 정한다.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-semibold">굿퀘스천</h1>
      <p className="text-zinc-500">준비 중</p>
    </main>
  );
}
