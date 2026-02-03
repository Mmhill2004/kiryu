import type { FC } from 'hono/jsx';

interface Props {
  score: number;
}

export const SecurityScore: FC<Props> = ({ score }) => {
  const scoreClass = score >= 80 ? 'score-good' : score >= 50 ? 'score-medium' : 'score-bad';

  return (
    <div class={`score-ring ${scoreClass}`} style={`--score: ${score}`}>
      <div class="score-inner">
        <span class="score-value">{score}</span>
        <span class="score-label">/ 100</span>
      </div>
    </div>
  );
};
