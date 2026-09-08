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
        <li>
          이당류부터는 [글리코시드 결합]과 [환원 말단]으로 두 당이 어디서 어떻게
          이어졌는지 확인하세요.
        </li>
        <li>비교 모드에서 두 구조를 같은 시점으로 돌려 보세요.</li>
        <li>질문에 답한 뒤 해설을 펼쳐 확인하세요.</li>
      </ol>
      <h3>잔기와 글리코시드 결합</h3>
      <p>
        당이 둘 이상이면 어느 당의 C1인지 구별해야 하므로 잔기 이름을 함께 씁니다
        (<strong>Glc A · C1</strong>). A가 아노머 탄소를 내어놓는 쪽, 그다음 글자가
        받는 쪽입니다.
      </p>
      <p>
        [글리코시드 결합]을 켜면 사슬을 잇는 결합은 파란 실선 관, 가지를 만드는
        결합은 보라 점선 관으로 표시되고 각각 표기가 붙습니다. 오른쪽 목록에서 결합
        하나를 고르면 그 결합의 공여 탄소 · 산소 · 받는 탄소가 자세히 표시됩니다.
      </p>
      <h3>다당류는 대표 fragment입니다</h3>
      <p>
        아밀로스·아밀로펙틴·글리코젠·셀룰로스 화면은 전체 고분자가 아니라 결합 방식을
        관찰하기 위한 <strong>대표 조각</strong>입니다. 결합의 종류와 위치는 정확하지만
        사슬 길이와 가지 개수는 관찰을 위해 정한 값이며, 실제 분자의 크기나 평균 가지
        빈도를 나타내지 않습니다. 녹말도 하나의 고정된 분자가 아니라 아밀로스와
        아밀로펙틴을 함께 포함하는 물질입니다.
      </p>
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
