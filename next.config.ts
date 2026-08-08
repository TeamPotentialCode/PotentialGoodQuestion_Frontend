import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright 가 127.0.0.1 로 접속하는데 dev 서버 기본 origin 은 localhost 라
  // cross-origin 으로 차단된다(HMR 포함). 개발 전용 설정이다.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
