import type { FC } from 'hono/jsx';

interface Props {
  score: number;
}

export const SecurityScore: FC<Props> = ({ score }) => {
  const scoreClass = score >= 80 ? 'score-good' : score >= 50 ? 'score-medium' : 'score-bad';
  const statusLabel = score >= 80 ? 'Excellent' : score >= 50 ? 'Fair' : 'Critical';

  return (
    <div class="score-container">
      <div class={`score-ring ${scoreClass}`} style={`--score: ${score}`}>
        {/* Animated orbital rings */}
        <div class="orbit orbit-1">
          <div class="orbit-dot"></div>
        </div>
        <div class="orbit orbit-2">
          <div class="orbit-dot"></div>
        </div>
        <div class="score-inner">
          <span class="score-value">{score}</span>
          <span class="score-label">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
};
