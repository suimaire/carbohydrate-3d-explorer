import { useEffect, useState } from "react";
export function OfflineStatus() {
  const [state, setState] = useState(
    import.meta.env.PROD ? "수업 자료 저장 중…" : "로컬 미리보기",
  );
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let active = true;
    if (!("serviceWorker" in navigator)) {
      setState("오프라인 저장 미지원");
      return;
    }
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (active) setState("✓ 오프라인 사용 준비 완료");
      })
      .catch(() => {
        if (active) setState("오프라인 저장 실패 · 연결을 확인하세요");
      });
    return () => {
      active = false;
    };
  }, []);
  return <span role="status">{state}</span>;
}
