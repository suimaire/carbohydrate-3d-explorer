import { useState } from "react";
export function ObservationQuestions({
  questions,
  answer,
}: {
  questions: string[];
  answer: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <section className="observations">
      <h3>관찰 질문</h3>
      <ol>
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <button
        className="answer-button"
        aria-expanded={revealed}
        onClick={() => setRevealed((x) => !x)}
      >
        {revealed ? "해설 접기 −" : "해설 보기 +"}
      </button>
      {revealed && <p className="answer">{answer}</p>}
    </section>
  );
}
