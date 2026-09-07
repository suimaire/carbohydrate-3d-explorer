import { useEffect, useRef } from "react";
export function HelpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open) dialog.current?.close();
  }, [open]);
  return (
    <dialog ref={dialog} onCancel={onClose} onClose={onClose}>
      <div className="dialog-heading">
        <h2>구조 탐색 안내</h2>
        <button onClick={onClose} aria-label="도움말 닫기">
          닫기 ×
        </button>
      </div>
      <h3>분자 움직이기</h3>
      <p>
        마우스 드래그로 회전하고 휠로 확대·축소합니다. 오른쪽 버튼 드래그 또는
        Ctrl + 드래그로 이동합니다. 태블릿에서는 한 손가락으로 회전하고 두
        손가락으로 확대·축소합니다.
      </p>
      <p>
        뷰어의 키보드 조작 영역에서도 방향키로 회전하고 + / −로 확대·축소할 수
        있습니다. 0 키 또는 [초기화]로 처음 시점으로 돌아갑니다.
      </p>
      <h3>관찰 순서</h3>
      <ol>
        <li>탄소 번호로 C1부터 고리를 따라가세요.</li>
        <li>OH와 아노머 탄소를 강조하세요.</li>
        <li>비교 모드에서 두 구조를 같은 시점으로 돌려 보세요.</li>
        <li>질문에 답한 뒤 해설을 펼쳐 확인하세요.</li>
      </ol>
      <h3>서로 다른 두 분류</h3>
      <p>
        <strong>위/아래(up/down)</strong>는 고리 면의 어느 쪽인지,{" "}
        <strong>axial/equatorial</strong>은 의자형에서 결합이 축 방향인지 바깥쪽
        방향인지를 나타냅니다. α/β를 언제나 axial/equatorial과 일대일로
        대응시키면 안 됩니다.
      </p>
      <p>
        이 도구는 대표적인 구조를 보여줍니다. 고리 뒤집힘, 용액 평형, 화학
        반응의 애니메이션은 포함하지 않습니다.
      </p>
    </dialog>
  );
}
